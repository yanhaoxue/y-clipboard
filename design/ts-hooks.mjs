/**
 * Node 的 ESM 解析器不认无扩展名的 TS 导入（Vite 认），
 * 这个 resolve 钩子补上 ".ts"，让 design/*.mts 能直接 import 业务模块做集成测试。
 *
 * 用法：node --experimental-strip-types --import ./design/ts-register.mjs design/xxx.mts
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (/^[./]/.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(specifier + '.ts', context)
    }
    throw err
  }
}
