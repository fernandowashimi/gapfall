import launcherPanelUrl from '../assets/sprites/launcher_panel.png'
import playfieldBackgroundUrl from '../assets/sprites/playfield_background.png'
import stoneBlockUrl from '../assets/sprites/stone_block.png'
import stoneBlockVariantUrl from '../assets/sprites/stone_block_variant.png'
import reinforcedOreUrl from '../assets/sprites/reinforced_ore.png'
import crackedOreUrl from '../assets/sprites/cracked_ore.png'
import tntBlockUrl from '../assets/sprites/tnt_block.png'
import explosionStripUrl from '../assets/sprites/explosion_strip.png'

export const EXPLOSION_FRAME_COUNT = 5
export const EXPLOSION_FRAME_WIDTH = 90
export const EXPLOSION_FRAME_HEIGHT = 45

export interface GameSprites {
  stoneBlock: HTMLImageElement
  stoneBlockVariant: HTMLImageElement
  reinforcedOre: HTMLImageElement | null
  crackedOre: HTMLImageElement | null
  tntBlock: HTMLImageElement
  playfieldBackground: HTMLImageElement
  launcherPanel: HTMLImageElement
  explosionStrip: HTMLImageElement | null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load sprite: ${src}`))
    image.src = src
  })
}

export function loadGameSprites(): Promise<GameSprites> {
  return Promise.all([
    loadImage(stoneBlockUrl),
    loadImage(stoneBlockVariantUrl),
    loadImage(reinforcedOreUrl).catch(() => null),
    loadImage(crackedOreUrl).catch(() => null),
    loadImage(tntBlockUrl),
    loadImage(playfieldBackgroundUrl),
    loadImage(launcherPanelUrl),
    loadImage(explosionStripUrl).catch(() => null),
  ]).then(
    ([
      stoneBlock,
      stoneBlockVariant,
      reinforcedOre,
      crackedOre,
      tntBlock,
      playfieldBackground,
      launcherPanel,
      explosionStrip,
    ]) => ({
      stoneBlock,
      stoneBlockVariant,
      reinforcedOre,
      crackedOre,
      tntBlock,
      playfieldBackground,
      launcherPanel,
      explosionStrip,
    }),
  )
}
