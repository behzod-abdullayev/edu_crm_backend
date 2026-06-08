declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: compression.CompressionOptions): RequestHandler;
  namespace compression {
    interface CompressionOptions {
      chunkSize?: number;
      filter?: (req: unknown, res: unknown) => boolean;
      level?: number;
      memLevel?: number;
      strategy?: number;
      threshold?: number | string;
      windowBits?: number;
    }
  }
  export = compression;
}
 