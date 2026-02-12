/**
 * 种子数据脚本：向 Supabase pixkee_comments 表插入 100 条多语言评论
 * 运行方式: node seed-comments.mjs
 */

const SUPABASE_URL = 'https://rcikfjxlmetxjezmoofr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V4E-b9l25JuVBRityKydcg_0Wksgfru';

// 100条多语言评论数据
const comments = [
  // ===== 中文 =====
  { content: "用了好几个月了，Pixkee 真的是我用过最好的在线压缩工具。图片压缩后画质几乎没有损失，而且速度飞快，完全免费，真的太良心了！强烈推荐给所有需要压缩文件的朋友们。", likes: 12 },
  { content: "之前一直用桌面端的压缩软件，偶然发现这个在线工具后就再也回不去了。轻量、快速、免费，压缩效果也非常好，简直是神器！", likes: 8 },
  { content: "希望能增加批量压缩的功能，每次只能一个一个上传有点麻烦。其他方面都很满意，压缩比可以自己调节这一点特别好。", likes: 3 },
  { content: "PDF压缩功能太强了！我一个30MB的文件压缩到了不到5MB，而且排版完全没有变。感谢Pixkee团队！", likes: 15 },
  { content: "界面简洁清爽，没有烦人的广告，加载速度也很快。这种体验在免费工具里真的非常少见。", likes: 6 },
  { content: "作为一个设计师，每天都要处理大量图片。这个工具帮我节省了很多时间和存储空间，压缩后的图片质量也完全满足需求。", likes: 9 },
  { content: "建议可以加一个暗色模式，晚上用的时候有点刺眼。除此之外，功能和体验都是一流的。", likes: 2 },
  { content: "视频压缩功能刚出来就试了，效果比预期好很多。一个200MB的视频压缩到50MB，画面几乎看不出区别。", likes: 11 },
  { content: "太方便了，不需要下载任何软件，打开浏览器就能用。而且还支持各种格式的转换，真的很全面。", likes: 7 },
  { content: "用Pixkee压缩过上百张照片了，从来没出过问题。稳定可靠，值得信赖的好工具。", likes: 5 },
  { content: "能不能支持更大文件的上传？目前的限制对于一些高清视频来说还是有点不够用。不过对于日常使用来说已经非常棒了。", likes: 4 },
  { content: "第一次用就爱上了，操作太简单了。拖拽文件进去，选好参数，点击压缩，几秒钟就搞定。", likes: 10 },

  // ===== 英语 =====
  { content: "Pixkee is hands down the best online compression tool I've ever used. The quality retention after compression is incredible, and the fact that it's completely free makes it even better. Highly recommended!", likes: 18 },
  { content: "I've been looking for a good free image compressor for months. Finally found this gem! Simple interface, fast processing, and great results every time.", likes: 7 },
  { content: "Just compressed a huge PDF from 45MB down to 3MB without any noticeable quality loss. This tool is absolutely magical. Thank you so much!", likes: 14 },
  { content: "The video compression feature is surprisingly good. I was skeptical at first, but the output quality exceeded my expectations. Great work, team!", likes: 9 },
  { content: "Would love to see a browser extension for quick access. Other than that, this is perfect for my daily workflow. Clean, fast, and efficient.", likes: 3 },
  { content: "As a web developer, I use this tool every single day to optimize images for my clients' websites. It's become an essential part of my toolkit.", likes: 11 },
  { content: "No ads, no sign-up required, no file size limits shenanigans. Just pure, honest compression. This is how free tools should be built.", likes: 22 },
  { content: "The format conversion options are really impressive. Being able to compress and convert in one step saves me so much time.", likes: 6 },
  { content: "Minor suggestion: it would be nice to have a progress indicator for larger files. Sometimes I'm not sure if it's still processing or stuck.", likes: 4 },
  { content: "Been using this for over a year now. Never had a single issue. Reliable, fast, and the compression ratios are consistently excellent.", likes: 8 },
  { content: "Shared this with my entire team and everyone loves it. We've completely switched from our old paid compression software.", likes: 13 },

  // ===== 日语 =====
  { content: "Pixkeeは本当に素晴らしいツールです。画像の圧縮品質が高く、操作も簡単で、しかも無料。毎日の仕事で欠かせない存在になりました。開発チームに感謝します！", likes: 10 },
  { content: "オンラインで使える圧縮ツールをいくつか試しましたが、これが一番使いやすいです。インターフェースがシンプルで直感的、処理速度も速いです。", likes: 6 },
  { content: "PDF圧縮機能が特に気に入っています。仕事で大量のPDFを扱うので、このツールのおかげで作業効率が格段に上がりました。", likes: 8 },
  { content: "動画圧縮も対応しているのが嬉しいです。画質をほとんど落とさずにファイルサイズを大幅に削減できるのが素晴らしい。", likes: 5 },
  { content: "改善提案として、日本語のUIがあるともっと使いやすくなると思います。でも現状でも十分直感的に操作できます。", likes: 3 },
  { content: "広告なし、登録不要、完全無料。こんな良心的なツールは珍しいです。友人にもおすすめしました。", likes: 12 },
  { content: "写真の圧縮に毎日使っています。品質を保ちながらサイズを小さくできるので、ブログの更新がとても楽になりました。", likes: 7 },

  // ===== 韩语 =====
  { content: "Pixkee 정말 최고의 온라인 압축 도구입니다! 이미지 품질 손실 없이 파일 크기를 크게 줄여주고, 무료라는 점이 더욱 놀랍습니다. 강력 추천합니다!", likes: 9 },
  { content: "사진을 많이 다루는 직업이라 압축 도구를 자주 사용하는데, 이 도구가 지금까지 써본 것 중 가장 좋습니다. 간편하고 빠르고 결과물도 훌륭해요.", likes: 7 },
  { content: "PDF 압축 기능이 정말 유용합니다. 30MB짜리 파일을 4MB로 줄였는데 내용이 전혀 손상되지 않았어요. 감사합니다!", likes: 11 },
  { content: "영상 압축도 가능한 건 몰랐는데, 써보니까 품질이 생각보다 훨씬 좋아서 놀랐습니다. 앞으로도 계속 사용할 예정입니다.", likes: 5 },
  { content: "인터페이스가 깔끔하고 광고도 없어서 사용 경험이 정말 좋습니다. 이런 무료 도구가 있다니 감사할 따름이에요.", likes: 8 },
  { content: "한국어 지원이 되면 더 좋을 것 같아요. 하지만 현재도 직관적이라 사용하는 데 큰 불편함은 없습니다.", likes: 3 },

  // ===== 西班牙语 =====
  { content: "¡Pixkee es increíble! Llevo meses usándolo para comprimir imágenes y PDF, y la calidad siempre es excelente. Es rápido, gratuito y muy fácil de usar. ¡Lo recomiendo a todos!", likes: 14 },
  { content: "He probado muchas herramientas de compresión en línea, pero esta es la mejor por lejos. La interfaz es limpia, sin anuncios molestos, y los resultados son impresionantes.", likes: 8 },
  { content: "La función de compresión de video me sorprendió gratamente. Reduje un archivo de 500MB a 100MB sin pérdida visible de calidad. ¡Fantástico!", likes: 10 },
  { content: "Como diseñadora gráfica, necesito una herramienta confiable para optimizar imágenes. Esta herramienta cumple con todo lo que necesito y más. Muchas gracias al equipo.", likes: 6 },
  { content: "Sería genial poder arrastrar y soltar múltiples archivos a la vez. Por lo demás, la herramienta es perfecta para mi trabajo diario.", likes: 4 },
  { content: "Uso esta herramienta todos los días en mi trabajo. Es ligera, rápida y los archivos comprimidos mantienen una calidad excelente. Totalmente recomendada.", likes: 9 },

  // ===== 法语 =====
  { content: "Pixkee est sans doute le meilleur outil de compression en ligne que j'ai utilisé. La qualité reste excellente après compression, et c'est entièrement gratuit. Bravo à l'équipe !", likes: 11 },
  { content: "J'utilise cet outil quotidiennement pour optimiser les images de mon site web. L'interface est intuitive, la compression est rapide et les résultats sont toujours impressionnants.", likes: 7 },
  { content: "La compression PDF est remarquable. J'ai réduit un document de 25MB à 2MB sans aucune perte de mise en page. C'est exactement ce dont j'avais besoin.", likes: 9 },
  { content: "Suggestion : ce serait super d'avoir une version en français de l'interface. Mais même en anglais, l'outil est très facile à utiliser et très efficace.", likes: 3 },
  { content: "Pas de publicités, pas d'inscription obligatoire, pas de limitations cachées. C'est rare de trouver un outil gratuit aussi honnête et performant.", likes: 15 },
  { content: "La compression vidéo fonctionne étonnamment bien. J'ai compressé plusieurs vidéos et la qualité est restée intacte à chaque fois.", likes: 6 },

  // ===== 德语 =====
  { content: "Pixkee ist das beste Online-Komprimierungstool, das ich je benutzt habe. Die Bildqualität bleibt nach der Komprimierung hervorragend, und es ist komplett kostenlos. Absolut empfehlenswert!", likes: 10 },
  { content: "Ich benutze dieses Tool täglich für die Bildoptimierung meiner Website. Schnell, einfach und die Ergebnisse sind immer erstklassig. Vielen Dank an das Entwicklerteam!", likes: 8 },
  { content: "Die PDF-Komprimierung ist beeindruckend. Eine 40MB-Datei wurde auf 4MB reduziert, ohne dass die Formatierung verloren ging. Genau was ich gebraucht habe.", likes: 12 },
  { content: "Verbesserungsvorschlag: Eine Batch-Verarbeitung für mehrere Dateien gleichzeitig wäre großartig. Ansonsten ist das Tool perfekt für meinen Arbeitsalltag.", likes: 4 },
  { content: "Kein Konto nötig, keine Werbung, keine versteckten Kosten. So sollte jedes kostenlose Tool funktionieren. Weiter so!", likes: 7 },
  { content: "Die Videokomprimierung funktioniert überraschend gut. Ich konnte große Dateien erheblich verkleinern, ohne merklichen Qualitätsverlust.", likes: 5 },

  // ===== 葡萄牙语 =====
  { content: "Pixkee é simplesmente incrível! Uso todos os dias para comprimir imagens e PDFs, e a qualidade sempre se mantém excelente. Rápido, gratuito e muito fácil de usar.", likes: 9 },
  { content: "Testei várias ferramentas online de compressão e esta é disparada a melhor. Interface limpa, sem anúncios irritantes e resultados impressionantes toda vez.", likes: 7 },
  { content: "A compressão de vídeo me surpreendeu muito. Reduzi um arquivo de 300MB para 60MB sem perda visível de qualidade. Parabéns à equipe!", likes: 11 },
  { content: "Como fotógrafo, preciso de uma ferramenta confiável para otimizar minhas fotos. Esta ferramenta superou todas as minhas expectativas. Muito obrigado!", likes: 6 },
  { content: "Seria ótimo ter suporte para português na interface. Mas mesmo assim, a ferramenta é muito intuitiva e fácil de usar.", likes: 3 },

  // ===== 意大利语 =====
  { content: "Pixkee è lo strumento di compressione online migliore che abbia mai usato. La qualità delle immagini resta eccellente dopo la compressione, ed è completamente gratuito!", likes: 10 },
  { content: "Uso questo strumento ogni giorno per ottimizzare le immagini del mio sito web. L'interfaccia è pulita e intuitiva, e i risultati sono sempre impressionanti.", likes: 7 },
  { content: "La compressione PDF è fantastica. Ho ridotto un file da 35MB a 3MB senza perdere la formattazione. Esattamente quello di cui avevo bisogno!", likes: 8 },
  { content: "Niente pubblicità, niente registrazione obbligatoria, niente costi nascosti. È raro trovare uno strumento gratuito così onesto e performante. Complimenti!", likes: 13 },
  { content: "La funzione di compressione video funziona sorprendentemente bene. Ho compresso diversi video e la qualità è rimasta intatta ogni volta.", likes: 5 },

  // ===== 俄语 =====
  { content: "Pixkee — это лучший онлайн-инструмент для сжатия, который я когда-либо использовал. Качество изображений после сжатия остаётся отличным, и это абсолютно бесплатно! Рекомендую всем!", likes: 11 },
  { content: "Пользуюсь этим инструментом каждый день для оптимизации изображений. Интерфейс простой и интуитивный, а результаты всегда впечатляют. Спасибо разработчикам!", likes: 8 },
  { content: "Сжатие PDF работает потрясающе. Файл в 50МБ уменьшился до 5МБ без потери форматирования. Именно то, что мне было нужно!", likes: 9 },
  { content: "Было бы здорово добавить русскоязычный интерфейс. Но даже сейчас инструмент очень понятный и удобный в использовании.", likes: 4 },
  { content: "Никакой рекламы, никакой обязательной регистрации, никаких скрытых платежей. Редко встречаешь такой честный и качественный бесплатный инструмент.", likes: 14 },

  // ===== 阿拉伯语 =====
  { content: "أداة Pixkee رائعة جداً! أستخدمها يومياً لضغط الصور وملفات PDF، والجودة ممتازة دائماً. أداة مجانية وسريعة وسهلة الاستخدام. أنصح بها بشدة!", likes: 10 },
  { content: "جربت العديد من أدوات الضغط عبر الإنترنت، لكن هذه الأداة هي الأفضل بلا منازع. واجهة نظيفة ونتائج مذهلة في كل مرة.", likes: 7 },
  { content: "ضغط الفيديو يعمل بشكل مدهش. قمت بتقليل حجم ملف من 400 ميغابايت إلى 80 ميغابايت دون فقدان ملحوظ في الجودة. عمل رائع!", likes: 8 },

  // ===== 泰语 =====
  { content: "Pixkee เป็นเครื่องมือบีบอัดออนไลน์ที่ดีที่สุดที่เคยใช้มา คุณภาพของภาพหลังบีบอัดยังคงยอดเยี่ยม และที่สำคัญมันฟรีทั้งหมด! แนะนำเลยครับ!", likes: 9 },
  { content: "ใช้เครื่องมือนี้ทุกวันสำหรับการปรับขนาดรูปภาพ หน้าเว็บสะอาดตา ไม่มีโฆษณารบกวน และผลลัพธ์ก็ดีมากทุกครั้ง ขอบคุณทีมผู้พัฒนาครับ", likes: 6 },
  { content: "ฟีเจอร์บีบอัด PDF ทำงานได้ดีมาก ลดขนาดไฟล์จาก 20MB เหลือแค่ 2MB โดยไม่สูญเสียการจัดรูปแบบเลย สุดยอดจริงๆ", likes: 7 },

  // ===== 越南语 =====
  { content: "Pixkee thực sự là công cụ nén trực tuyến tốt nhất mà tôi từng sử dụng. Chất lượng hình ảnh sau khi nén vẫn xuất sắc, và hoàn toàn miễn phí! Rất khuyến khích mọi người dùng thử.", likes: 8 },
  { content: "Tôi sử dụng công cụ này hàng ngày để tối ưu hóa hình ảnh cho trang web của mình. Giao diện sạch sẽ, tốc độ nhanh và kết quả luôn ấn tượng. Cảm ơn đội ngũ phát triển!", likes: 6 },
  { content: "Tính năng nén PDF hoạt động tuyệt vời. Tôi đã giảm một file 25MB xuống còn 3MB mà không mất định dạng. Đúng là thứ tôi cần!", likes: 10 },

  // ===== 印尼语 =====
  { content: "Pixkee adalah alat kompresi online terbaik yang pernah saya gunakan. Kualitas gambar tetap bagus setelah kompresi, dan sepenuhnya gratis! Sangat direkomendasikan untuk semua orang.", likes: 9 },
  { content: "Saya menggunakan alat ini setiap hari untuk mengoptimalkan gambar. Antarmukanya bersih, cepat, dan hasilnya selalu luar biasa. Terima kasih tim pengembang!", likes: 7 },
  { content: "Fitur kompresi video bekerja dengan sangat baik. Saya berhasil mengurangi file 250MB menjadi 50MB tanpa kehilangan kualitas yang terlihat. Kerja bagus!", likes: 5 },

  // ===== 土耳其语 =====
  { content: "Pixkee şimdiye kadar kullandığım en iyi çevrimiçi sıkıştırma aracı. Görüntü kalitesi sıkıştırmadan sonra bile mükemmel kalıyor ve tamamen ücretsiz! Herkese şiddetle tavsiye ederim!", likes: 10 },
  { content: "Bu aracı her gün resim optimizasyonu için kullanıyorum. Arayüzü temiz ve sezgisel, sonuçlar her zaman etkileyici. Geliştirme ekibine teşekkürler!", likes: 6 },
  { content: "PDF sıkıştırma özelliği harika çalışıyor. 30MB'lık bir dosyayı biçimlendirmeyi kaybetmeden 3MB'a düşürdüm. Tam ihtiyacım olan şey!", likes: 8 },

  // ===== 波兰语 =====
  { content: "Pixkee to najlepsze narzędzie do kompresji online, jakie kiedykolwiek używałem. Jakość obrazów po kompresji jest doskonała, a narzędzie jest całkowicie darmowe! Gorąco polecam!", likes: 9 },
  { content: "Używam tego narzędzia codziennie do optymalizacji obrazów na mojej stronie. Interfejs jest czysty i intuicyjny, a wyniki zawsze imponujące. Wielkie dzięki!", likes: 7 },

  // ===== 荷兰语 =====
  { content: "Pixkee is verreweg de beste online compressietool die ik ooit heb gebruikt. De beeldkwaliteit blijft uitstekend na compressie, en het is helemaal gratis! Sterk aanbevolen!", likes: 8 },
  { content: "Ik gebruik deze tool dagelijks om afbeeldingen te optimaliseren. De interface is schoon en intuïtief, en de resultaten zijn altijd indrukwekkend. Bedankt, team!", likes: 6 },

  // ===== 瑞典语 =====
  { content: "Det här är det bästa komprimeringsverktyget jag har använt online. Bildkvaliteten förblir utmärkt efter komprimering, och det är helt gratis! Stark rekommendation!", likes: 7 },

  // ===== 印地语 =====
  { content: "Pixkee सबसे अच्छा ऑनलाइन कम्प्रेशन टूल है जो मैंने कभी इस्तेमाल किया है। कम्प्रेशन के बाद भी इमेज क्वालिटी बेहतरीन रहती है, और यह पूरी तरह से मुफ्त है! बहुत बहुत धन्यवाद!", likes: 10 },
  { content: "मैं हर दिन इस टूल का इस्तेमाल अपनी वेबसाइट की इमेज को ऑप्टिमाइज़ करने के लिए करता हूं। इंटरफ़ेस साफ़ और सहज है, और नतीजे हमेशा प्रभावशाली होते हैं।", likes: 6 },

  // ===== 希腊语 =====
  { content: "Το Pixkee είναι το καλύτερο εργαλείο συμπίεσης online που έχω χρησιμοποιήσει ποτέ. Η ποιότητα εικόνας παραμένει εξαιρετική μετά τη συμπίεση και είναι εντελώς δωρεάν! Το συνιστώ ανεπιφύλακτα!", likes: 8 },

  // ===== 捷克语 =====
  { content: "Pixkee je nejlepší online kompresní nástroj, jaký jsem kdy použil. Kvalita obrázků zůstává po kompresi vynikající a je zcela zdarma! Vřele doporučuji všem!", likes: 7 },

  // ===== 马来语 =====
  { content: "Pixkee adalah alat pemampatan dalam talian terbaik yang pernah saya guna. Kualiti gambar kekal cemerlang selepas pemampatan, dan ia percuma sepenuhnya! Saya sangat mengesyorkan alat ini!", likes: 6 },

  // ===== 繁体中文 =====
  { content: "Pixkee真的太好用了！我每天都用它來壓縮圖片和PDF檔案，壓縮後的品質幾乎看不出差別。免費、快速、好用，大力推薦給所有人！", likes: 11 },
  { content: "找了好久終於找到這麼好用的線上壓縮工具。介面簡潔乾淨，沒有煩人的廣告，壓縮速度也超快。真的是一個很良心的免費工具。", likes: 8 },
  { content: "建議可以增加更多輸出格式的選項，比如WebP格式。目前的功能已經很棒了，但如果能多支援一些格式就更完美了。", likes: 4 },
];

// 生成从 2023-01-01 到 2026-02-12 之间的随机日期，每天最多一条
function generateRandomDates(count) {
  const start = new Date('2023-01-01').getTime();
  const end = new Date('2026-02-12').getTime();
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  
  // 随机选取 count 个不重复的天数
  const daySet = new Set();
  while (daySet.size < count) {
    daySet.add(Math.floor(Math.random() * totalDays));
  }
  
  // 排序（最新的在前）
  const sortedDays = Array.from(daySet).sort((a, b) => b - a);
  
  return sortedDays.map(dayOffset => {
    const date = new Date(start + dayOffset * 24 * 60 * 60 * 1000);
    // 添加随机时间（0-23小时，0-59分钟）
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(Math.floor(Math.random() * 60));
    return date.getTime();
  });
}

async function seedComments() {
  const timestamps = generateRandomDates(comments.length);
  
  const records = comments.map((comment, index) => ({
    content: comment.content,
    timestamp: timestamps[index],
    likes: comment.likes,
    replies: [],
    image: null,
  }));

  console.log(`准备插入 ${records.length} 条评论...`);
  console.log(`时间范围: ${new Date(Math.min(...timestamps)).toLocaleDateString()} ~ ${new Date(Math.max(...timestamps)).toLocaleDateString()}`);

  // 分批插入，每批 25 条
  const batchSize = 25;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pixkee_comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`批次 ${Math.floor(i / batchSize) + 1} 插入失败:`, response.status, errorText);
      continue;
    }

    const result = await response.json();
    inserted += result.length;
    console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1}: 成功插入 ${result.length} 条 (累计 ${inserted}/${records.length})`);
  }

  console.log(`\n🎉 完成！成功插入 ${inserted} 条多语言评论。`);
}

seedComments().catch(console.error);
