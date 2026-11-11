// One-off utility: convert the AI illustration PNGs in vibe_images/ into
// lightweight WebP files for public/art/. Requires `sharp` (installed in the
// local build sandbox only, not a project dependency).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = process.env.ART_SRC ?? path.join(ROOT, 'vibe_images')
const OUT = process.env.ART_OUT ?? path.join(ROOT, 'public', 'art')

const files = {
  'nhay-day-tuong-tuong': 'strongkids-art-nhay-day-tuong-tuong_1794411987817_9968ad17.png',
  'ngoi-sao-bat-nhay': 'strongkids-art-ngoi-sao-bat-nhay-v2_1794412018331_ea4e60dd.png',
  'chay-nang-cao-goi': 'strongkids-art-chay-nang-cao-goi_1794412049317_05194757.png',
  'nhay-lo-co-doi-chan': 'strongkids-art-nhay-lo-co-doi-chan_1794412081103_856baccc.png',
  'da-got': 'strongkids-art-da-got_1794412112691_dcbb9574.png',
  'dam-khong-khi': 'strongkids-art-dam-khong-khi_1794412142789_89e272c9.png',
  'squat-ghe-tuong-tuong': 'strongkids-art-squat-ghe-tuong-tuong_1794412191106_bd3b58d1.png',
  'chong-day-tuong': 'strongkids-art-chong-day-tuong_1794412221603_889ec58b.png',
  'cau-vong-hong': 'strongkids-art-cau-vong-hong_1794412248557_44a1a6dc.png',
  'gau-di-dao': 'strongkids-art-gau-di-dao_1794412276722_f9089e69.png',
  'cua-di-ngang': 'strongkids-art-cua-di-ngang-v2_1794412811610_4b46ba48.png',
  'sieu-nhan-bay': 'strongkids-art-sieu-nhan-bay_1794412325239_e4b5bed2.png',
  'co-mot-chan': 'strongkids-art-co-mot-chan_1794412370201_561b11e4.png',
  'di-duong-thang': 'strongkids-art-di-duong-thang_1794412403959_940c77bd.png',
  'giu-khan-tren-dau': 'strongkids-art-giu-khan-tren-dau_1794412433609_51782a8f.png',
  'chim-hac': 'strongkids-art-chim-hac_1794412467153_a90a1a51.png',
  'di-nhon-got': 'strongkids-art-di-nhon-got_1794412495659_aaf8c890.png',
  'tu-the-cay': 'strongkids-art-tu-the-cay_1794412530910_5901d61b.png',
  'meo-vuon-lung': 'strongkids-art-meo-vuon-lung-v2_1794412874142_fa8fc6e2.png',
  'cho-cui-chao': 'strongkids-art-cho-cui-chao_1794412655996_90f4f38d.png',
  'buom-vo-canh': 'strongkids-art-buom-vo-canh_1794412682742_81fe263e.png',
  'xoay-nguoi-chu-t': 'strongkids-art-xoay-nguoi-chu-t-v2_1794412906116_c2d6a46e.png',
  'nguoi-tuyet-tan': 'strongkids-art-nguoi-tuyet-tan_1794412741188_6c6eb334.png',
  'duoi-chan-cham-ngon': 'strongkids-art-duoi-chan-cham-ngon_1794412775297_0b9bd7d2.png',
  'nhay-o-so': 'strongkids-art-nhay-o-so-v2_1794413339060_753ea822.png',
  'tung-bat-bong': 'strongkids-art-tung-bat-bong_1794412968415_56057d69.png',
  'vo-tay-doi-nhip': 'strongkids-art-vo-tay-doi-nhip_1794412991912_2f708b82.png',
  'di-zic-zac': 'strongkids-art-di-zic-zac_1794413021436_b172de47.png',
  'chan-trai-tay-phai': 'strongkids-art-chan-trai-tay-phai_1794413052640_3847ddc9.png',
  'nem-bong-vao-ro': 'strongkids-art-nem-bong-vao-ro_1794413084238_2bf97a0e.png',
  'dua-thu-rung': 'strongkids-art-dua-thu-rung_1794413124951_a5768451.png',
  'nhay-dong-lanh': 'strongkids-art-nhay-dong-lanh_1794413158265_9b9a18ac.png',
  'san-kho-bau': 'strongkids-art-san-kho-bau_1794413183916_58d72df8.png',
  'da-bong-mini': 'strongkids-art-da-bong-mini_1794413211572_e9b1068c.png',
  'chuyen-bong-qua-lai': 'strongkids-art-chuyen-bong-qua-lai_1794413236984_e3c09202.png',
  'thu-thach-bat-nhay': 'strongkids-art-thu-thach-bat-nhay_1794413261464_a45021cf.png',
}

await mkdir(OUT, { recursive: true })

let total = 0
for (const [slug, file] of Object.entries(files)) {
  const out = path.join(OUT, `${slug}.webp`)
  const info = await sharp(path.join(SRC, file))
    .resize(1024, 576, { fit: 'cover' })
    .webp({ quality: 82, effort: 5 })
    .toFile(out)
  total += info.size
  console.log(`${slug}.webp  ${(info.size / 1024).toFixed(1)} KB`)
}

console.log(`\n${Object.keys(files).length} images · ${(total / 1024).toFixed(0)} KB total`)
