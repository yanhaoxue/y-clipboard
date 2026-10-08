/**
 * 侧栏分类 回归测试
 *   node --experimental-strip-types --import ./design/ts-register.mjs design/check-cats.mts
 *
 * 起因：「全部」和「文本」的图标都是三条横线，16px 下根本分不出来。
 * 这里守住两件事：
 *   1. 任意两个分类的图标 path 都不相同（防止再次撞车）
 *   2. 图标 path 本身是合法的（能在 SVG 里画出来）
 */

let pass = 0
let fail = 0

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected
  if (ok) pass++
  else fail++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  期望=${String(expected)} 实际=${String(actual)}`}`
  )
}

const { CATS, catIconColor } = await import('../src/utils/categories.ts')
const { KIND_META } = await import('../src/utils/format.ts')

console.log('--- 分类完整性 ---')
check('分类数量', CATS.length, 8)
check(
  '分类顺序',
  CATS.map((c) => c.key).join(','),
  'all,text,link,code,color,image,file,star'
)
check('每个分类都有标签', CATS.every((c) => !!c.label), true)
check('每个分类都有图标', CATS.every((c) => typeof c.icon === 'string' && c.icon.length > 0), true)

/* ------------------------------------------------------------------ */
/* 1. 图标不得撞车                                                     */
/* ------------------------------------------------------------------ */

console.log('\n--- 图标唯一性（16px 下长得像=分不出来）---')

const uniq = new Set(CATS.map((c) => c.icon))
check('图标两两不同', uniq.size, CATS.length)

const all = CATS.find((c) => c.key === 'all')!
const text = CATS.find((c) => c.key === 'text')!
check('全部 ≠ 文本（回归）', all.icon === text.icon, false)

// 曾经出问题的形态：三条横线（M..h..×3），只有 6 个命令、没有闭合形状。
// 剪贴板是有板体 + 夹子的闭合图形，命令数与形态都明显不同。
const allCmds = (all.icon.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || []).length
check('全部不再是三条横线那种简单图形', allCmds >= 8, true)
check('全部有闭合形状', /z$/i.test(all.icon.trim()), true)

for (const c of CATS) {
  check(`「${c.label}」图标唯一`, CATS.filter((x) => x.icon === c.icon).length, 1)
}

/* ------------------------------------------------------------------ */
/* 2. path 合法性                                                      */
/* ------------------------------------------------------------------ */

console.log('\n--- path 语法 ---')

const CMD = /[MmLlHhVvCcSsQqTtAaZz]/
function pathCommands(d: string): string[] {
  return (d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [])
}

for (const c of CATS) {
  const d = c.icon.trim()
  check(`「${c.label}」以 M 开头`, d[0], 'M')
  check(`「${c.label}」只含合法命令字符`, /^[MmLlHhVvCcSsQqTtAaZz0-9.\-\s,]+$/.test(d), true)
  // 连续两个相同命令（如 "MM"）说明漏了参数；"zM" 这类不同命令相邻是合法的
  check(`「${c.label}」无重复空命令`, /([MmLlHhVvCcSsQqTtAaZz])\1/.test(d.replace(/\s/g, '')), false)
  check(`「${c.label}」至少 2 个命令`, pathCommands(d).length >= 2, true)
  check(`「${c.label}」不以逗号/小数点结尾`, /[,.]$/.test(d), false)
  // viewBox 是 0 0 24 24。相对命令的数字是增量、可以为负，所以这里只防
  // 手滑写出离谱数值（真正越界只能渲染后看），不能当严格边界校验
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  check(`「${c.label}」数值不超出 viewBox 量级`, Math.max(...nums.map(Math.abs)) <= 24, true)
}

/* ------------------------------------------------------------------ */
/* 3. 配色                                                             */
/* ------------------------------------------------------------------ */

console.log('\n--- 配色 ---')

check('全部用中性色（不是一种内容类型）', all.color, undefined)
check('全部图标色为中性灰', catIconColor(all), 'var(--text-2)')
const colored = CATS.filter((c) => c.key !== 'all')
check('其余分类都有专属色', colored.every((c) => !!c.color), true)
check('分类色互不相同', new Set(colored.map((c) => c.color)).size, colored.length)
check('有颜色时返回该颜色', catIconColor(text), 'var(--c-text)')

/* ------------------------------------------------------------------ */
/* 4. 与列表项类型图标的关系                                            */
/* ------------------------------------------------------------------ */

console.log('\n--- 与 KIND_META 的关系 ---')

// 侧栏的分类图标应当复用列表项的类型图标，避免同一类型出现两套图形
for (const k of ['text', 'link', 'code', 'color', 'image', 'file'] as const) {
  const cat = CATS.find((c) => c.key === k)!
  check(`「${cat.label}」复用 KIND_META 图标`, cat.icon === KIND_META[k].icon, true)
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
if (fail > 0) process.exitCode = 1
