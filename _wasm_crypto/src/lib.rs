// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
mod digest;

use crate::digest::Context as DigestContext;
use std::alloc::alloc;
use std::alloc::dealloc;
use std::alloc::Layout;
use std::mem::align_of;

#[no_mangle]
pub unsafe fn digest_malloc(len: usize) -> *mut u8 {
  let align = align_of::<usize>();
  let layout = Layout::from_size_align_unchecked(len, align);
  alloc(layout)
}

/// Returns the digest of the given `data` using the given hash `algorithm`.
///
/// `length` will usually be left `undefined` to use the default length for
/// the algorithm. For algorithms with variable-length output, it can be used
/// to specify a non-negative integer number of bytes.
///
/// An error will be thrown if `algorithm` is not a supported hash algorithm or
/// `length` is not a supported length for the algorithm.
#[no_mangle]
pub fn digest(
  algorithm: digest::ContextType,
  data: *const u8,
  data_len: usize,
  out_length: Option<usize>,
) -> *mut u8 {
  let mut context = DigestContext::new(algorithm);
  context.update(unsafe { std::slice::from_raw_parts(data, data_len) });
  let boxed = context.digest_and_drop(out_length);
  Box::into_raw(boxed) as _
}

/// Creates a new context incrementally computing a digest using the given
/// hash algorithm.
///
/// An error will be thrown if `algorithm` is not a supported hash algorithm.
#[no_mangle]
pub fn digest_context_new(
  algorithm: digest::ContextType,
) -> *mut DigestContext {
  Box::into_raw(Box::new(DigestContext::new(algorithm)))
}

#[no_mangle]
pub fn digest_context_free(context: *mut DigestContext) {
  unsafe { Box::from_raw(context) };
}

/// Update the digest's internal state with the additional input `data`.
#[no_mangle]
pub fn digest_context_update(
  context: *mut DigestContext,
  data: *const u8,
  data_len: usize,
) {
  let context = unsafe { &mut *context };
  context.update(unsafe { std::slice::from_raw_parts(data, data_len) });
}

/// Resets this context to its initial state, as though it has not yet been
/// provided with any input data. (It will still use the same algorithm.)
#[no_mangle]
pub unsafe fn digest_context_reset(context: *mut DigestContext) {
  let mut context = Box::from_raw(context);
  context.reset();
}

/// Returns the digest of the input data so far. This may be called repeatedly
/// without side effects.
#[no_mangle]
pub fn digest_context_digest(
  context: *mut DigestContext,
  out_length: Option<usize>,
) {
  let context = unsafe { &mut *context };
  let boxed = context.digest(out_length);
  Box::into_raw(boxed);
}

#[no_mangle]
pub unsafe fn digest_context_digest_and_drop(
  context: *mut DigestContext,
  out_length: Option<usize>,
) -> *mut u8 {
  let context = Box::from_raw(context);
  let boxed = context.digest_and_drop(out_length);
  Box::into_raw(boxed) as _
}
