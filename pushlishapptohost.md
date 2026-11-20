# Quy trình publish app lên hosting AZDIGI

Tài liệu này dùng chung cho các app frontend tĩnh (Vite/React hoặc build ra thư mục tĩnh).
Đã áp dụng thành công cho **StrongKids**; dùng lại cho **Benbitoicung**, **FlyersFC** bằng cách đổi các biến ở mục 0.

## 0. Thông tin môi trường hosting

| Thông tin | Giá trị |
|---|---|
| Trang quản trị | https://my.azdigi.com/login → vào cPanel |
| cPanel | https://hfn44-22268.azdigihost.com:2083 (user `fjskykcn`) |
| Home directory | `/home/fjskykcn` |
| Domain chính | `ajisoft.net` (docroot `public_html` — **không dùng cho app**) |
| Addon domain | `thichcoiphim.net` — đã dùng **1/1 slot**, không thêm domain mới |
| Subdomain | **Không giới hạn** (dạng `<ten-app>.ajisoft.net`) |
| SSL | Let's Encrypt wildcard `*.ajisoft.net` — **mọi subdomain có HTTPS sẵn** |
| Dung lượng | 6 GB (đang dùng ~1 GB), bandwidth không giới hạn |
| Web server | Apache 2.4.71 + LiteSpeed, hỗ trợ `.htaccess` |
| Build trên server | Không cần — build ở máy, upload file tĩnh |

**Quy ước mỗi app = 1 subdomain = 1 docroot riêng, nằm ngoài `public_html`:**

```
/home/fjskykcn/strongkids.ajisoft.net
/home/fjskykcn/benbitoicung.ajisoft.net
/home/fjskykcn/flyersfc.ajisoft.net
```

Bảng biến cần điền cho từng app:

| Biến | StrongKids | Benbitoicung | FlyersFC |
|---|---|---|---|
| `APP_NAME` | strongkids | benbitoicung | flyersfc |
| `APP_URL` | https://strongkids.ajisoft.net | https://benbitoicung.ajisoft.net | https://flyersfc.ajisoft.net |
| `DOCROOT` | `/home/fjskykcn/strongkids.ajisoft.net` | `/home/fjskykcn/benbitoicung.ajisoft.net` | `/home/fjskykcn/flyersfc.ajisoft.net` |
| `BUILD_DIR` | `dist` | `dist` | `dist` |
| Supabase project | `lmgezsqcstlnsgwpvlri` (StrongKids) | (project riêng hoặc chung, khác bảng) | (project riêng hoặc chung, khác bảng) |
| Turnstile site key | `0x4AAAAAAF_LsxJsn11RNGfq` (widget “StrongKids OTP”) | key riêng hoặc dùng chung widget | key riêng hoặc dùng chung widget |

> **Turnstile:** hiện dùng chung **một widget** tên “StrongKids OTP” (mode Managed) cho cả 3 app — mỗi app chỉ cần **thêm hostname** vào widget đó (tối đa 10 hostname/widget). Không cần tạo widget mới nếu dùng chung tài khoản Cloudflare.
>
> **Supabase:** app dùng chung project thì phải **tách bảng** dữ liệu; nhưng **URL Configuration và captcha là cấu hình chung của project**, không tách theo app được — xem mục 5.1.

## 1. Tạo subdomain + docroot riêng (làm 1 lần cho mỗi app)

1. cPanel → **Domains** → **Create A New Domain**.
2. Chọn **Registered Domain**, nhập domain đầy đủ, ví dụ `strongkids.ajisoft.net` (cPanel tự nhận đây là subdomain của `ajisoft.net`).
3. **Bỏ tick** ô *“Share document root … with ajisoft.net”*.
4. Ô **Document Root** để mặc định `strongkids.ajisoft.net` → tương đương `/home/fjskykcn/strongkids.ajisoft.net`.
5. Bấm **Submit**.
6. Kiểm tra: vào **SSL/TLS Certificates → Status**, subdomain mới phải hiện *“AutoSSL Domain Validated”* (wildcard `*.ajisoft.net` phủ sẵn). Nếu chưa, bấm **Run AutoSSL**.
7. Kiểm tra HTTPS bằng trình duyệt: mở `https://strongkids.ajisoft.net` — lúc này 404 là bình thường vì thư mục trống.

> Không cần tạo database, PHP, Node app cho app tĩnh.

## 2. Chuẩn bị file `.htaccess` cho app

Tạo file `.htaccess` trong thư mục build (hoặc upload riêng vào docroot). Nội dung mẫu:

```apache
Options -MultiViews
DirectoryIndex index.html

# SPA fallback (cần nếu app dùng BrowserRouter; HashRouter thì không bắt buộc nhưng vô hại)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

# MIME types (LiteSpeed thường đã có, khai báo lại cho chắc)
AddType image/webp .webp
AddType font/woff2 .woff2
AddType application/javascript .js .mjs
AddType application/manifest+json .webmanifest

# Không cache HTML và service worker để PWA nhận bản mới
<IfModule mod_headers.c>
  <FilesMatch "^(index\.html|sw\.js|registerSW\.js|manifest\.webmanifest)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Cache dài cho asset có hash
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

Lưu ý:
- **Không** thêm rule ép HTTPS bằng `.htaccess` nếu domain đang đi qua Cloudflare proxy (dễ gây redirect loop). Ưu tiên bật *Force HTTPS Redirect* trong cPanel → Domains (áp dụng toàn account, cân nhắc vì ảnh hưởng domain khác).
- Nếu LiteSpeed Cache được bật cho account, kiểm tra lại sau deploy để chắc `sw.js` không bị cache.

## 3. Build production ở máy

1. Đảm bảo `.env.local` (hoặc `.env.production`) có đủ biến:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/publishable key>
   VITE_TURNSTILE_SITE_KEY=<site key>
   ```
   Biến Vite được nhúng vào bundle **lúc build** — build sai env thì phải build lại.
2. Chạy:
   ```bash
   npm ci
   npm run build
   ```
3. Kiểm tra: `npm run preview` → mở http://localhost:4173, test nhanh đăng nhập và các trang chính.
4. Kiểm tra `base` trong `vite.config.ts` là `/` (mặc định) vì app chạy ở gốc subdomain.

## 4. Đóng gói và upload

Nén **nội dung bên trong** thư mục build (không nén cả thư mục `dist`):

```bash
cd dist
zip -r ../deploy-<ten-app>.zip .
```

Upload bằng 1 trong 3 cách:

**Cách A — File Manager (đơn giản nhất):**
1. cPanel → **File Manager** → nhập đường dẫn docroot vào ô địa chỉ, ví dụ `/home/fjskykcn/strongkids.ajisoft.net` → Go.
2. **Upload** file zip → chọn file → **Extract** → chọn extract vào docroot → xóa file zip sau khi xong.
3. Kiểm tra còn file `.htaccess` (đặt cùng cấp `index.html`).

**Cách B — FTP/SFTP:** dùng tài khoản FTP của cPanel, upload nội dung `dist/` vào docroot.

**Cách C — SSH/rsync:** cPanel có SSH Access/Terminal. Nếu dùng, có thể `rsync -avz --delete dist/ fjskykcn@<host>:/home/fjskykcn/<sub>.ajisoft.net/`.

Sau upload, kiểm tra quyền: thư mục `755`, file `644`.

## 5. Cấu hình dịch vụ ngoài (mỗi app một lần)

Ba chỗ phải khớp nhau thì đăng nhập mới chạy: **site key trong bundle** ↔ **hostname trên widget Turnstile** ↔ **secret key trong Supabase**. Lệch một chỗ là captcha không cấp token hoặc Supabase trả `captcha_failed`.

### 5.1 Supabase — URL Configuration

Vào project → **Authentication → URL Configuration**:

1. **Site URL** = `https://<sub>.ajisoft.net/` (có dấu `/` cuối). Giá trị này cũng là `{{ .SiteURL }}` trong mẫu email.
   - StrongKids: đã đổi từ `https://strongkids.vercel.app/` sang `https://strongkids.ajisoft.net/` ngày 2026-11-19.
2. **Redirect URLs** → bấm **Add URL**, mỗi app một dòng `https://<sub>.ajisoft.net/**`.
   - Giữ lại URL cũ (`https://strongkids.vercel.app/**`, `http://localhost:5173/**`) cho tới khi ngừng hẳn môi trường đó.
   - Mỗi lần chỉ thêm 1 URL rồi **Save URLs**; ô nhập cho phép dán nhiều URL (mỗi dòng một cái).
3. Bấm **Save changes**.

App dùng luồng **mã OTP 6 số**, không phải magic link, nên không có bước redirect trình duyệt; Site URL vẫn phải đúng vì nằm trong mẫu email gửi cho phụ huynh.

### 5.2 Supabase — Captcha (Attack Protection)

Vào **Authentication → Attack Protection**:

- **Enable Captcha protection**: bật.
- **Choose Captcha Provider**: `Turnstile by Cloudflare`.
- **Captcha secret**: phải là secret **của đúng widget** có site key đã dùng lúc build. Bấm **Reveal** rồi đối chiếu với trang **Edit Widget** bên Cloudflare.
- Nếu bấm **Rotate Secret Key** ở Cloudflare thì phải dán secret mới vào đây **ngay**; trong ~2 giờ đầu secret cũ vẫn dùng được, sau đó mọi OTP sẽ trả `captcha_failed`.
- Secret **chỉ** nằm ở ô này — không đưa vào `.env`, không commit, không gửi qua chat.

### 5.3 Supabase — Bảng dữ liệu và RLS

- Script khởi tạo/sửa policy: `supabase/schema.sql`, chạy trong **SQL Editor** (idempotent — chạy lại an toàn).
- Thiết kế có chủ đích: `revoke all ... from anon` + `grant select, insert, update, delete ... to authenticated` + RLS `auth.uid() = user_id`.
  → Gọi REST bằng anon key sẽ trả **`401 / 42501`** — **đây là đúng**, không phải lỗi cấu hình.
- Lưu ý: SQL Editor chạy bằng quyền quản trị, **bỏ qua RLS** — chỉ dùng SELECT khi kiểm tra, cẩn thận với UPDATE/DELETE.
- Xoá user trong **Authentication → Users** sẽ **cascade xoá** hàng `family_state` của người đó.
- Sửa `data` trực tiếp trong Table Editor sẽ bị app ghi đè ở thao tác kế tiếp (app giữ cache máy + đẩy lên); muốn sửa tay thì bảo người dùng đóng app trước.

### 5.4 Cloudflare Turnstile — thêm hostname

Widget hiện tại: **“StrongKids OTP”**, site key `0x4AAAAAAF_LsxJsn11RNGfq`, mode **Managed**, tối đa **10 hostname/widget**.

1. Mở https://dash.cloudflare.com → mục **Turnstile** → chọn widget, đối chiếu **Sitekey** với `VITE_TURNSTILE_SITE_KEY` trong `.env.local`.
2. Bấm **Edit Widget** → mục **Hostname Management**.
3. Gõ `<sub>.ajisoft.net` vào ô *“Search or enter a hostname”*. Danh sách xổ xuống hiện dòng **“Add “<sub>.ajisoft.net” as a custom hostname”** → **bấm vào dòng đó**. Gõ xong bấm Enter suông **không** thêm được.
4. Bấm **Update**. Dòng đếm phải tăng (ví dụ `3 out of 10`).
5. Có hiệu lực gần như tức thì — không cần build hay deploy lại.

Đã cấu hình: `localhost`, `strongkids.vercel.app`, `strongkids.ajisoft.net` → còn 7 slot cho Benbitoicung/FlyersFC.

### 5.5 Kiểm chứng sau khi cấu hình

| Kiểm tra | Cách làm | Kết quả đúng |
|---|---|---|
| Widget cấp token | Mở trang đăng nhập trên domain mới | Ô captcha hiện **“Thành công!”**, Console **không** còn cảnh báo `110200` |
| Supabase chấp nhận captcha | Gọi thử `POST /auth/v1/otp` kèm token nhưng **email sai định dạng** (không gửi mail) | Trả `validation_failed` về email, **không** trả `captcha_failed` |
| Đăng nhập | Nhập email → nhận mã 6 số (hạn 10 phút) → nhập mã | Vào được app; F5 vẫn giữ phiên |
| Đọc dữ liệu cloud | Xoá `localStorage` rồi đăng nhập | Hồ sơ bé hiện ra ⇒ dữ liệu đến từ Supabase, không phải cache |
| Ghi dữ liệu cloud | Đổi bé đang chọn (hoặc một thao tác bất kỳ) → chờ ~1s | `family_state.updated_at` tăng, `data` phản ánh thay đổi |
| RLS | Đăng nhập rồi `GET /rest/v1/family_state?user_id=eq.<uuid lạ>` | Trả `[]`, không lỗi, không lộ dữ liệu người khác |

### 5.6 Nếu nhiều app dùng chung một Supabase project

- Tách **bảng** dữ liệu cho từng app; không dùng chung `family_state`.
- URL Configuration và captcha là **cấu hình chung** của project: Site URL chỉ giữ được **một** giá trị → đặt domain của app chính; các app khác vẫn phải có mặt trong **Redirect URLs** và trong hostname của widget Turnstile.

## 6. Checklist kiểm tra sau deploy

- [ ] `https://<sub>.ajisoft.net` mở được, không cảnh báo chứng chỉ.
- [ ] DevTools → Console không có lỗi mixed content / 404 asset / `Turnstile 110200`.
- [ ] Ô captcha trên trang đăng nhập hiện “Thành công!”.
- [ ] Đăng nhập OTP nhận email, xác thực thành công.
- [ ] Supabase → Table Editor → `family_state` có đúng 1 hàng của tài khoản vừa đăng nhập.
- [ ] Dữ liệu lưu → reload vẫn còn; đăng xuất/đăng nhập lại vẫn sync.
- [ ] DevTools → Application → Service Worker: đăng ký ở scope `/`.
- [ ] `curl -I https://<sub>.ajisoft.net/sw.js` trả `Content-Type: application/javascript` và `Cache-Control: no-cache`.
- [ ] `curl -I https://<sub>.ajisoft.net/art/<file>.webp` trả `image/webp`.
- [ ] Cài PWA trên điện thoại (Thêm vào màn hình chính) và mở ở chế độ standalone.
- [ ] Deep link dạng `https://<sub>.ajisoft.net/#/bai-tap` mở đúng trang.

## 7. Cập nhật phiên bản sau này

1. Build lại ở máy với env tương ứng.
2. Nén `dist/` → upload → Extract ghi đè vào docroot.
3. Giữ 1 bản backup trước khi ghi đè:
   ```bash
   # trên server (nếu có SSH)
   mv /home/fjskykcn/<sub>.ajisoft.net /home/fjskykcn/backup/<sub>-$(date +%F)
   mkdir /home/fjskykcn/<sub>.ajisoft.net
   ```
   Hoặc dùng cPanel → **Backup** / **JetBackup 5** để snapshot trước khi deploy.
4. Mở app → nếu PWA đang mở, bấm cập nhật khi có prompt (app đang dùng `registerType: 'prompt'`).

## 8. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Trình duyệt báo `ERR_CERT_COMMON_NAME_INVALID` ngay sau khi tạo subdomain | Vhost/cert chưa nạp kịp | Đợi 1–2 phút, tải lại; nếu vẫn lỗi vào SSL/TLS → Status → **Run AutoSSL** |
| 404 toàn bộ | Upload sai thư mục (nằm trong `public_html` hoặc thừa 1 cấp `dist/`) | Upload lại đúng docroot, `index.html` phải nằm ngay trong docroot |
| 403 Forbidden | Sai quyền file | Thư mục `755`, file `644` |
| Trang cũ không mất sau khi deploy | Cache LiteSpeed hoặc service worker | Xóa cache trong LiteSpeed Web Cache Manager; DevTools → Application → Unregister SW rồi reload |
| Turnstile lỗi `110200` (Console warn), ô captcha trống | Hostname chưa nằm trong widget | Thêm hostname ở mục 5.4 rồi bấm **Update** (không cần deploy lại) |
| Supabase trả `captcha_failed` | Secret trong Supabase không khớp widget (hoặc vừa Rotate) | Dán lại secret đúng widget ở mục 5.2 |
| Supabase trả `otp_expired` | Mã đã dùng, quá 10 phút, hoặc đã bị mã mới thay thế | Xin mã mới; mỗi lần bấm gửi lại thì mã cũ mất hiệu lực |
| REST trả `401 / 42501` khi chưa đăng nhập | `anon` bị revoke theo thiết kế | Không cần xử lý |
| OTP không gửi / link trong email trỏ về domain cũ | Supabase Site URL chưa đổi | Sửa URL Configuration như mục 5.1 |
| PWA không cài được | Không phải HTTPS hoặc `sw.js` sai MIME/scope | Kiểm tra HTTPS, header `sw.js`, file phải ở gốc docroot |

## 9. Nguyên tắc an toàn

- Không commit `.env*` chứa key thật; key Supabase anon/publishable và Turnstile site key là key công khai (được phép nằm trong bundle), nhưng **service role key tuyệt đối không đưa vào frontend**.
- **Turnstile secret key chỉ lưu trong Supabase** (Authentication → Attack Protection): không dán vào repo, tài liệu, chat hay biến `VITE_*`.
- Không lưu mật khẩu cPanel/FTP trong repo hoặc trong tài liệu này.
- Mỗi app dùng một Supabase project riêng nếu có thể; nếu dùng chung, tách bảng và bật RLS theo `user_id`.