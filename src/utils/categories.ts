import type { Category } from '../types'
import { KIND_META } from './format'

export interface CatDef {
  key: Category
  label: string
  /** 未定义表示"中性"（如"全部"不是一种内容类型，用中性灰） */
  color?: string
  icon: string
}

/**
 * 侧栏分类。
 *
 * 图标是 16px 显示的，两个分类的图标一旦长得像（比如都是几条横线），
 * 用户根本分不出来 —— "全部"和"文本"就撞过一次。
 * design/check-cats.mts 会断言这些图标两两不同。
 */
export const CATS: CatDef[] = [
  {
    // 剪贴板：与插件 logo 呼应，"全部"= 整个剪贴板历史（而不是"一堆横线"）。
    // 板顶的横线故意分左右两段（x 5.5~7 与 17~18.5），中间空出来给夹子，
    // 两条线就不会贴在一起糊成一片 —— 16px 下差这 1px 看得见。
    key: 'all',
    label: '全部',
    icon:
      'M17 6h1.5A1.5 1.5 0 0 1 20 7.5v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5' +
      'v-11A1.5 1.5 0 0 1 5.5 6H7' +
      'M10 2.5h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z'
  },
  { key: 'text', label: '文本', color: 'var(--c-text)', icon: KIND_META.text.icon },
  { key: 'link', label: '链接', color: 'var(--c-link)', icon: KIND_META.link.icon },
  { key: 'code', label: '代码', color: 'var(--c-code)', icon: KIND_META.code.icon },
  { key: 'color', label: '颜色', color: 'var(--c-color)', icon: KIND_META.color.icon },
  { key: 'image', label: '图片', color: 'var(--c-image)', icon: KIND_META.image.icon },
  { key: 'file', label: '文件', color: 'var(--c-file)', icon: KIND_META.file.icon },
  {
    key: 'star',
    label: '收藏',
    color: 'var(--star)',
    icon: 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8z'
  }
]

/** 图标描边色：分类色优先，"全部"用中性灰（它不是一种内容类型） */
export function catIconColor(def: CatDef): string {
  return def.color || 'var(--text-2)'
}
