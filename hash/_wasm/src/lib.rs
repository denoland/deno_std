// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

use digest::{Digest, DynDigest, ExtendableOutput, Reset, Update, XofReader};
use wasm_bindgen::prelude::*;

/// A Hasher for any supported cryptographic hash algorithm, wrapping them in
/// a common interface for our WASM use.
#[wasm_bindgen]
#[derive(Clone)]
pub struct Hasher {
    algorithm: &'static str,
    inner: HashBox,
}

#[derive(Clone)]
enum HashBox {
    DynDigest(Box<dyn DynDigest>),
    Blake3(Box<blake3::Hasher>),
    Shake128(Box<sha3::Shake128>),
    Shake256(Box<sha3::Shake256>),
}

struct HashProperties {
    pub output_size: usize,
    pub extendable: Option<ExtendableHashProperties>,
}

struct ExtendableHashProperties {
    pub seekable: Option<SeekableHashProperties>,
}

struct SeekableHashProperties;

#[wasm_bindgen]
impl Hasher {
    /// Creates a new hasher given a supported algorithm name.
    #[wasm_bindgen(constructor)]
    pub fn new(algorithm: &str) -> Result<Hasher, JsValue> {
        fn dyn_digest(
            algorithm: &'static str,
            inner: impl DynDigest + 'static,
        ) -> Result<Hasher, JsValue> {
            boxed(algorithm, HashBox::DynDigest(Box::new(inner)))
        }

        fn boxed(algorithm: &'static str, inner: HashBox) -> Result<Hasher, JsValue> {
            Ok(Hasher { algorithm, inner })
        }

        match algorithm {
            "blake2b" => dyn_digest("blake2b", blake2::Blake2b::new()),
            "blake2s" => dyn_digest("blake2s", blake2::Blake2s::new()),
            "blake3" => boxed("blake3", HashBox::Blake3(Box::new(blake3::Hasher::new()))),
            "keccak224" => dyn_digest("keccak224", sha3::Keccak224::new()),
            "keccak256" => dyn_digest("keccak256", sha3::Keccak256::new()),
            "keccak384" => dyn_digest("keccak384", sha3::Keccak384::new()),
            "keccak512" => dyn_digest("keccak512", sha3::Keccak512::new()),
            "md2" => dyn_digest("md2", md2::Md2::new()),
            "md4" => dyn_digest("md4", md4::Md4::new()),
            "md5" => dyn_digest("md5", md5::Md5::new()),
            "ripemd160" => dyn_digest("ripemd160", ripemd160::Ripemd160::new()),
            "ripemd320" => dyn_digest("ripemd320", ripemd320::Ripemd320::new()),
            "sha1" => dyn_digest("sha1", sha1::Sha1::new()),
            "sha224" => dyn_digest("sha224", sha2::Sha224::new()),
            "sha256" => dyn_digest("sha256", sha2::Sha256::new()),
            "sha3-224" => dyn_digest("sha3-224", sha3::Sha3_224::new()),
            "sha3-256" => dyn_digest("sha3-256", sha3::Sha3_256::new()),
            "sha3-384" => dyn_digest("sha3-384", sha3::Sha3_384::new()),
            "sha3-512" => dyn_digest("sha3-512", sha3::Sha3_512::new()),
            "sha384" => dyn_digest("sha384", sha2::Sha384::new()),
            "sha512" => dyn_digest("sha512", sha2::Sha512::new()),
            "shake128" => boxed(
                "shake128",
                HashBox::Shake128(Box::new(sha3::Shake128::default())),
            ),
            "shake256" => boxed(
                "shake256",
                HashBox::Shake256(Box::new(sha3::Shake256::default())),
            ),
            _ => Err(
                js_sys::Error::new(&format!("unsupported hash algorithm: {}", algorithm)).into(),
            ),
        }
    }

    /// Properties of the algorithm being used in this hasher instance.
    fn properties(&self) -> HashProperties {
        match &self.inner {
            HashBox::DynDigest(hasher) => HashProperties {
                output_size: hasher.output_size(),
                extendable: None,
            },
            HashBox::Blake3(hasher) => HashProperties {
                output_size: hasher.output_size(),
                extendable: Some(ExtendableHashProperties {
                    seekable: Some(SeekableHashProperties),
                }),
            },
            HashBox::Shake128(_hasher) => {
                HashProperties {
                    /// Minimum size for full security (NIST FIPS 202, Table 4).
                    output_size: (2 * 128) / 8,
                    extendable: Some(ExtendableHashProperties { seekable: None }),
                }
            }
            HashBox::Shake256(_hasher) => {
                HashProperties {
                    /// Minimum size for full security (NIST FIPS 202, Table 4).
                    output_size: (2 * 256) / 8,
                    extendable: Some(ExtendableHashProperties { seekable: None }),
                }
            }
        }
    }

    /// Resets this hasher to its initial (emtpy) state.
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        match &mut self.inner {
            HashBox::DynDigest(hasher) => {
                hasher.reset();
            }
            HashBox::Blake3(hasher) => {
                hasher.reset();
            }
            HashBox::Shake128(hasher) => {
                hasher.reset();
            }
            HashBox::Shake256(hasher) => {
                hasher.reset();
            }
        }
    }

    /// Updates this hasher's sate with binary message data.
    #[wasm_bindgen]
    pub fn update(&mut self, data: &[u8]) {
        match &mut self.inner {
            HashBox::DynDigest(hasher) => {
                hasher.update(data);
            }
            HashBox::Blake3(hasher) => {
                hasher.update(data);
            }
            HashBox::Shake128(hasher) => {
                hasher.update(data);
            }
            HashBox::Shake256(hasher) => {
                hasher.update(data);
            }
        }
    }

    /// Returns the binary digest of the hasher's current state. If the hash
    /// algorithm being used is extensible, a length parameter may be provided,
    /// otherwise it must be None.
    #[wasm_bindgen]
    pub fn digest(&self, length: Option<usize>) -> Result<Box<[u8]>, JsValue> {
        match length {
            None => match self.inner {
                HashBox::DynDigest(ref hasher) => Ok(hasher.clone().finalize()),
                HashBox::Blake3(ref hasher) => {
                    Ok(Box::new(*blake3::Hasher::finalize(&hasher).as_bytes()))
                }
                HashBox::Shake128(ref hasher) => Ok(hasher
                    .clone()
                    .finalize_xof()
                    .read_boxed(self.properties().output_size)),
                HashBox::Shake256(ref hasher) => Ok(hasher
                    .clone()
                    .finalize_xof()
                    .read_boxed(self.properties().output_size)),
            },
            Some(length) => match self.inner {
                HashBox::Blake3(ref hasher) => {
                    Ok(blake3::Hasher::finalize_xof(&hasher).read_boxed(length))
                }
                HashBox::Shake128(ref hasher) => {
                    Ok(hasher.clone().finalize_xof().read_boxed(length))
                }
                HashBox::Shake256(ref hasher) => {
                    Ok(hasher.clone().finalize_xof().read_boxed(length))
                }
                HashBox::DynDigest(_) => {
                    let digest = self.digest(None);
                    if let Ok(ref digest) = digest {
                        if digest.len() != length {
                            return Err(js_sys::Error::new(&format!(
                                "incorrect length ({}B) requested for fixed-length ({}B) hash algorithm ({})",
                                length,
                                digest.len(),
                                self.algorithm,
                            ))
                            .into());
                        }
                    }
                    digest
                }
            },
        }
    }

    /// Returns the binary digest of the hasher's current state, then resets it
    /// to its initial state. This can be a more efficient option if you're
    /// going to be reusing this hasher instance.
    #[wasm_bindgen(js_name=digestAndReset)]
    pub fn digest_and_reset(&mut self, length: Option<usize>) -> Result<Box<[u8]>, JsValue> {
        match length {
            None => match self.inner {
                HashBox::DynDigest(ref mut hasher) => Ok(hasher.finalize_reset()),
                HashBox::Shake128(ref mut hasher) => Ok(hasher
                    .finalize_xof_reset()
                    .read_boxed(self.properties().output_size)),
                HashBox::Shake256(ref mut hasher) => Ok(hasher
                    .finalize_xof_reset()
                    .read_boxed(self.properties().output_size)),
                _ => {
                    let digest = self.digest(None);
                    self.reset();
                    digest
                }
            },
            Some(length) => match self.inner {
                HashBox::Shake128(ref mut hasher) => {
                    Ok(hasher.finalize_xof_reset().read_boxed(length))
                }
                HashBox::Shake256(ref mut hasher) => {
                    Ok(hasher.finalize_xof_reset().read_boxed(length))
                }
                _ => {
                    let digest = self.digest(Some(length));
                    self.reset();
                    digest
                }
            },
        }
    }

    /// Returns a new hasher that's a copy of this one.
    #[wasm_bindgen]
    #[allow(clippy::should_implement_trait)]
    pub fn clone(&self) -> Hasher {
        Clone::clone(self)
    }
}
