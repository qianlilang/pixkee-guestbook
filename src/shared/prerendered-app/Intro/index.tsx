import type { FileDropEvent } from 'file-drop-element';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import type { SnackOptions } from 'shared/custom-els/snack-bar';

import { h, Component } from 'preact';

import { linkRef } from 'shared/prerendered-app/util';
import '../../custom-els/loading-spinner';
import logo from 'url:./imgs/logo.svg';
import pixkeeLogo from 'url:./imgs/pixkee_logo_composite.png';
import mountainDemo from 'url:./imgs/demos/demo-mountain.jpg';
import smartphoneDemo from 'url:./imgs/demos/demo-smartphone.jpg';
import beachDemo from 'url:./imgs/demos/demo-beach.jpg';
import earbudsDemo from 'url:./imgs/demos/demo-earbuds.jpg';
import mountainIcon from 'url:./imgs/demos/icon-demo-mountain.jpg';
import smartphoneIcon from 'url:./imgs/demos/icon-demo-smartphone.jpg';
import beachIcon from 'url:./imgs/demos/icon-demo-beach.jpg';
import earbudsIcon from 'url:./imgs/demos/icon-demo-earbuds.jpg';
import smallSectionAsset from 'url:./imgs/info-content/fast.png';
import simpleSectionAsset from 'url:./imgs/info-content/light.png';
import secureSectionAsset from 'url:./imgs/info-content/secure.png';
import * as style from './style.css';
import 'shared/custom-els/snack-bar';

const demos = [
  {
    description: 'Mountain landscape',
    size: '1.2MB',
    filename: 'mountain.jpg',
    url: mountainDemo,
    iconUrl: mountainIcon,
  },
  {
    description: 'Product photo',
    size: '890KB',
    filename: 'smartphone.jpg',
    url: smartphoneDemo,
    iconUrl: smartphoneIcon,
  },
  {
    description: 'Beach sunset',
    size: '1.5MB',
    filename: 'beach.jpg',
    url: beachDemo,
    iconUrl: beachIcon,
  },
  {
    description: 'Electronics',
    size: '950KB',
    filename: 'earbuds.jpg',
    url: earbudsDemo,
    iconUrl: earbudsIcon,
  },
] as const;

const features = [
  {
    icon: '⚡',
    title: 'Smart Compression',
    description: 'Advanced algorithms reduce file size while preserving quality.',
  },
  {
    icon: '🎨',
    title: 'Multi-Format Support',
    description: 'Convert between JPEG, PNG, WebP, AVIF, and more.',
  },
  {
    icon: '🔒',
    title: 'Privacy First',
    description: 'All processing happens locally. Your images never leave your device.',
  },
  {
    icon: '👁️',
    title: 'Real-time Preview',
    description: 'Compare original and compressed images side by side.',
  },
];

const steps = [
  { number: '1', title: 'Upload', description: 'Drop or select your image' },
  { number: '2', title: 'Adjust', description: 'Choose format and quality' },
  { number: '3', title: 'Download', description: 'Save your optimized image' },
];

const formats = [
  { name: 'JPEG', color: '#E91E63' },
  { name: 'PNG', color: '#9C27B0' },
  { name: 'WebP', color: '#673AB7' },
  { name: 'AVIF', color: '#3F51B5' },
  { name: 'JPEG XL', color: '#2196F3' },
  { name: 'GIF', color: '#00BCD4' },
];

const supportsClipboardAPI =
  !__PRERENDER__ && navigator.clipboard && navigator.clipboard.read;

async function getImageClipboardItem(
  items: ClipboardItem[],
): Promise<undefined | Blob> {
  for (const item of items) {
    const type = item.types.find((type) => type.startsWith('image/'));
    if (type) return item.getType(type);
  }
}

interface Props {
  onFile?: (file: File | File[]) => void;
  showSnack?: SnackBarElement['showSnackbar'];
  onFeedbackClick?: () => void;
  files?: File[];
  lang: 'en' | 'zh';
  setLang: (lang: 'en' | 'zh') => void;
  Batch?: typeof import('client/lazy-app/Batch').default;
}
interface State {
  fetchingDemoIndex?: number;
  isLangMenuOpen: boolean;
}

const translations = {
  en: {
    heroTitle: 'Compress images',
    heroHighlight: 'instantly',
    heroSubtitle: 'The ultimate image optimizer. Reduce file sizes without losing quality.',
    dropText: 'Drop image here',
    browseText: 'or click to browse',
    pasteText: 'or paste from clipboard (Ctrl+V)',
    clipboardNoPermission: 'No permission to access clipboard',
    clipboardNoImage: 'No image found in the clipboard',
    sampleLabel: 'Or try a sample:',
    featuresTitle: 'Why Choose Pixkee?',
    howItWorksTitle: 'How It Works',
    formatsTitle: 'Supported Formats',
    footer: '© 2026 Pixkee',
    steps: [
      { title: 'Upload', description: 'Drop or select your image' },
      { title: 'Adjust', description: 'Choose format and quality' },
      { title: 'Download', description: 'Save your optimized image' },
    ],
    features: [
      { title: 'Smart Compression', description: 'Advanced algorithms reduce file size while preserving quality.' },
      { title: 'Multi-Format Support', description: 'Convert between JPEG, PNG, WebP, AVIF, and more.' },
      { title: 'Privacy First', description: 'All processing happens locally. Your images never leave your device.' },
      { title: 'Real-time Preview', description: 'Compare original and compressed images side by side.' },
    ],
    benefits: {
      fast: { title: 'Fast', desc: 'Lightning-fast compression powered by WebAssembly. Process images in seconds, right in your browser.' },
      light: { title: 'Light', desc: 'Drastically reduce file sizes without visible quality loss. Perfect for web, mobile apps, and email.' },
      secure: { title: 'Secure', desc: 'Worried about privacy? Images never leave your device since Pixkee does all the work locally.' },
    },
    nav: {
      guestbook: 'Guestbook',
      product: 'Product',
      pricing: 'Pricing',
      login: 'Login',
    }
  },
  zh: {
    heroTitle: '图片压缩',
    heroHighlight: '瞬间完成',
    heroSubtitle: '极致的图片优化工具。在不损失画质的情况下大幅减小文件体积。',
    dropText: '拖拽图片到这里',
    browseText: '或点击上传',
    pasteText: '或从剪贴板粘贴 (Ctrl+V)',
    clipboardNoPermission: '没有剪贴板访问权限',
    clipboardNoImage: '剪贴板中没有找到图片',
    sampleLabel: '或者试试示例图片：',
    featuresTitle: '为什么选择 Pixkee？',
    howItWorksTitle: '工作流程',
    formatsTitle: '支持的格式',
    footer: '© 2026 Pixkee',
    steps: [
      { title: '上传', description: '拖拽或选择您的图片' },
      { title: '调整', description: '选择格式和压缩质量' },
      { title: '下载', description: '保存优化后的图片' },
    ],
    features: [
      { title: '智能压缩', description: '先进算法在保持画质的同时减小体积。' },
      { title: '多格式支持', description: '支持 JPEG, PNG, WebP, AVIF 等多种格式转换。' },
      { title: '隐私优先', description: '所有处理都在本地进行。您的图片永远不会上传到服务器。' },
      { title: '实时预览', description: '并排对比原图和压缩后的效果。' },
    ],
    benefits: {
      fast: { title: '极速', desc: 'WebAssembly 驱动的闪电般压缩速度。在浏览器中秒级处理图片。' },
      light: { title: '轻盈', desc: '大幅减少文件大小，肉眼几乎看不出画质损失。非常适合网页、移动应用和邮件。' },
      secure: { title: '安全', desc: '担心隐私？Pixkee 所有工作都在本地完成，图片绝不离开您的设备。' },
    },
    nav: {
      guestbook: '留言板',
      product: '产品',
      pricing: '价格',
      login: '登录',
    }
  }
};

export default class Intro extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isLangMenuOpen: false,
    };
  }

  private toggleLang = () => {
    this.setState(prev => ({ isLangMenuOpen: !prev.isLangMenuOpen }));
  }

  private setLang = (lang: 'en' | 'zh') => {
    this.props.setLang(lang);
    this.setState({ isLangMenuOpen: false });
  }

  // ... (existing handlers: onOpenClick, byDemoClick, onPasteClick) remain unchanged, just update render

  private onOpenClick = () => {
    // Create a temporary input to ensure 'multiple' works correctly
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('multiple', 'multiple'); // Explicit attribute for safety
    input.accept = 'image/*';
    input.style.display = 'none'; // hidden
    document.body.appendChild(input);

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      console.log('Dynamic Input: files selected', files);
      if (files && files.length > 0) {
        if (files.length === 1) {
          this.props.onFile!(files[0]);
        } else {
          this.props.onFile!(Array.from(files));
        }
      }
      document.body.removeChild(input);
    };

    input.click();
  };

  private onDemoClick = async (index: number, event: Event) => {
    try {
      this.setState({ fetchingDemoIndex: index });
      const demo = demos[index];
      const blob = await fetch(demo.url).then((r) => r.blob());
      const file = new File([blob], demo.filename, { type: blob.type });
      this.props.onFile!(file);
    } catch (err) {
      this.setState({ fetchingDemoIndex: undefined });
      this.props.showSnack!("Couldn't fetch demo image");
    }
  };

  private onPasteClick = async () => {
    const t = translations[this.props.lang];
    let clipboardItems: ClipboardItem[];
    try {
      clipboardItems = await navigator.clipboard.read();
    } catch (err) {
      this.props.showSnack!(t.clipboardNoPermission);
      return;
    }
    const blob = await getImageClipboardItem(clipboardItems);
    if (!blob) {
      this.props.showSnack!(t.clipboardNoImage);
      return;
    }
    this.props.onFile!(new File([blob], 'image.unknown'));
  };

  render(
    { lang }: Props,
    { fetchingDemoIndex, isLangMenuOpen }: State,
  ) {
    const t = translations[lang];

    return (
      <div class={style.page}>
        {/* Header */}
        <header class={style.header}>
          <div class={style.headerInner}>
            <div class={style.logoContainer}>
              <img class={style.logoIcon} src={pixkeeLogo} alt="" />
              <span class={style.logoText}>Pixkee</span>
            </div>
            <nav class={style.headerNav}>
              {/* Language Switcher */}
              <div class={style.langContainer}>
                <button class={style.langButton} onClick={this.toggleLang}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  {lang === 'en' ? 'English' : '简体中文'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ marginLeft: 4 }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {isLangMenuOpen && (
                  <div class={style.langMenu}>
                    <button class={style.langMenuItem} onClick={() => this.setLang('en')}>English</button>
                    <button class={style.langMenuItem} onClick={() => this.setLang('zh')}>简体中文</button>
                  </div>
                )}
              </div>

              <button class={style.navLink} onClick={this.props.onFeedbackClick}>
                {t.nav.guestbook}
              </button>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section class={style.hero}>
          <div class={style.heroContent}>
            <h1 class={style.heroTitle}>
              {t.heroTitle} <span class={style.heroHighlight}>{t.heroHighlight}</span>
            </h1>
            <p class={style.heroSubtitle}>
              {t.heroSubtitle}
            </p>

            {/* Upload Area */}
            <div class={style.uploadArea} onClick={this.onOpenClick}>
              <div class={style.uploadIcon}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
              </div>
              <p class={style.uploadText}>
                <strong>{t.dropText}</strong> {t.browseText} <span style={{ marginLeft: 4, opacity: 0.5, fontSize: '0.9em' }}>(1-30)</span>
              </p>
              {supportsClipboardAPI && (
                <button class={style.pasteButton} onClick={(e) => { e.stopPropagation(); this.onPasteClick(); }}>
                  {t.pasteText}
                </button>
              )}
            </div>

            {/* Batch Processing UI */}
            {this.props.files && this.props.files.length > 0 && this.props.Batch && (
              <this.props.Batch
                files={this.props.files}
                showSnack={this.props.showSnack!}
                onBack={() => this.props.onFile!([])}
                lang={lang}
              />
            )}

            {/* Demo Images */}
            <div class={style.demoSection}>
              <p class={style.demoLabel}>{t.sampleLabel}</p>
              <div class={style.demoGrid}>
                {demos.map((demo, i) => (
                  <button
                    class={style.demoItem}
                    onClick={(event) => this.onDemoClick(i, event)}
                  >
                    <img class={style.demoImage} src={demo.iconUrl} alt={demo.description} />
                    {fetchingDemoIndex === i && (
                      <div class={style.demoLoading}>
                        <loading-spinner />
                      </div>
                    )}
                    <span class={style.demoSize}>{demo.size}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section >

        {/* Features Section */}
        < section class={style.features}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>{t.featuresTitle}</h2>
            <div class={style.featureGrid}>
              {features.map((feature, i) => (
                <div class={style.featureCard}>
                  <span class={style.featureIcon}>{feature.icon}</span>
                  <h3 class={style.featureTitle}>{t.features[i].title}</h3>
                  <p class={style.featureDesc}>{t.features[i].description}</p>
                </div>
              ))}
            </div>
          </div>
        </section >

        {/* How It Works */}
        < section class={style.howItWorks}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>{t.howItWorksTitle}</h2>
            <div class={style.stepsGrid}>
              {steps.map((step, i) => (
                <div class={style.stepCard}>
                  <div class={style.stepNumber}>{step.number}</div>
                  <h3 class={style.stepTitle}>{t.steps[i].title}</h3>
                  <p class={style.stepDesc}>{t.steps[i].description}</p>
                  {i < steps.length - 1 && <div class={style.stepArrow}>→</div>}
                </div>
              ))}
            </div>
          </div>
        </section >

        {/* Supported Formats */}
        < section class={style.formats}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>{t.formatsTitle}</h2>
            <div class={style.formatGrid}>
              {formats.map((format) => (
                <div class={style.formatBadge} style={{ '--format-color': format.color }}>
                  {format.name}
                </div>
              ))}
            </div>
          </div>
        </section >

        {/* Benefits Section (Small / Simple / Secure) */}
        < section class={style.benefits}>
          <div class={style.container}>
            <div class={style.benefitCard}>
              <div class={style.benefitImage}>
                <img src={smallSectionAsset} alt="Small file sizes" width="300" />
              </div>
              <div class={style.benefitContent}>
                <h2 class={style.benefitTitle}>{t.benefits.fast.title}</h2>
                <p class={style.benefitDesc}>{t.benefits.fast.desc}</p>
              </div>
            </div>

            <div class={style.benefitCard}>
              <div class={style.benefitContent}>
                <h2 class={style.benefitTitle}>{t.benefits.light.title}</h2>
                <p class={style.benefitDesc}>{t.benefits.light.desc}</p>
              </div>
              <div class={style.benefitImage}>
                <img src={simpleSectionAsset} alt="Simple to use" width="300" />
              </div>
            </div>

            <div class={style.benefitCard}>
              <div class={style.benefitImage}>
                <img src={secureSectionAsset} alt="Secure and private" width="300" />
              </div>
              <div class={style.benefitContent}>
                <h2 class={style.benefitTitle}>{t.benefits.secure.title}</h2>
                <p class={style.benefitDesc}>{t.benefits.secure.desc}</p>
              </div>
            </div>
          </div>
        </section >

        {/* Footer */}
        < footer class={style.footer}>
          <div class={style.container}>
            <p>{t.footer}</p>
          </div>
        </footer >

        <snack-bar ref={linkRef(this, 'snackbar')} />
      </div >
    );
  }
}

