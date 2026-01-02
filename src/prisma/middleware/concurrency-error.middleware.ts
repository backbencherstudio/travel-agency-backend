// An example of such a middleware.
// Note: Prisma middleware is deprecated in Prisma v6
// Use Prisma Client Extensions instead if needed
// import { Prisma } from '@prisma/client';

// export function ConcurrencyErrorMiddleware<
//   T extends Prisma.BatchPayload = Prisma.BatchPayload,
// >(): Prisma.Middleware {
//   return async (
//     params: Prisma.MiddlewareParams,
//     next: (params: Prisma.MiddlewareParams) => Promise<T>,
//   ): Promise<T> => {
//     const result = await next(params);
//     if (
//       (params.action === 'updateMany' || params.action === 'deleteMany') &&
//       params.args.where.version &&
//       result.count === 0
//     ) {
//       throw new Error('Something went wrong');
//     }
//     return result;
//   };
// }
