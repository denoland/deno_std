const _ByteLengthQueuingStrategy = ByteLengthQueuingStrategy,
  _CountQueuingStrategy = CountQueuingStrategy,
  _ReadableByteStreamController = ReadableByteStreamController,
  _ReadableStream = ReadableStream,
  _ReadableStreamDefaultController = (globalThis
.ReadableStreamDefaultController as unknown) as ReadableStreamDefaultController,
  _ReadableStreamDefaultReader = ReadableStreamDefaultReader,
  _TextDecoderStream = TextDecoderStream,
  _TextEncoderStream = TextEncoderStream,
  _TransformStream = TransformStream,
  _TransformStreamDefaultController = (globalThis
.TransformStreamDefaultController as unknown) as TransformStreamDefaultController,
  _WritableStream = WritableStream,
  _WritableStreamDefaultController = (globalThis
.WritableStreamDefaultController as unknown) as WritableStreamDefaultController,
  _WritableStreamDefaultWriter = WritableStreamDefaultWriter;

export {
  _ByteLengthQueuingStrategy as ByteLengthQueuingStrategy,
  _CountQueuingStrategy as CountQueuingStrategy,
  _ReadableByteStreamController as ReadableByteStreamController,
  _ReadableStream as ReadableStream,
  _ReadableStreamDefaultController as ReadableStreamDefaultController,
  _ReadableStreamDefaultReader as ReadableStreamDefaultReader,
  _TextDecoderStream as TextDecoderStream,
  _TextEncoderStream as TextEncoderStream,
  _TransformStream as TransformStream,
  _TransformStreamDefaultController as TransformStreamDefaultController,
  _WritableStream as WritableStream,
  _WritableStreamDefaultController as WritableStreamDefaultController,
  _WritableStreamDefaultWriter as WritableStreamDefaultWriter,
};

export default {
  ReadableStream,
  ReadableStreamDefaultReader,
  ReadableByteStreamController,
  ReadableStreamDefaultController: _ReadableStreamDefaultController,
  TransformStream,
  TransformStreamDefaultController: _TransformStreamDefaultController,
  WritableStream,
  WritableStreamDefaultWriter,
  WritableStreamDefaultController: _WritableStreamDefaultController,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
  TextEncoderStream,
  TextDecoderStream,
};
