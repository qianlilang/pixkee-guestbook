import type { FileDropEvent } from 'file-drop-element';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import type { SnackOptions } from 'shared/custom-els/snack-bar';

import { h, Component } from 'preact';

import { linkRef } from 'shared/prerendered-app/util';
import '../../custom-els/loading-spinner';
import logo from 'url:./imgs/logo.svg';
import largePhoto from 'url:./imgs/demos/demo-large-photo.jpg';
import artwork from 'url:./imgs/demos/demo-artwork.jpg';
import deviceScreen from 'url:./imgs/demos/demo-device-screen.png';
import largePhotoIcon from 'url:./imgs/demos/icon-demo-large-photo.jpg';
import artworkIcon from 'url:./imgs/demos/icon-demo-artwork.jpg';
import deviceScreenIcon from 'url:./imgs/demos/icon-demo-device-screen.jpg';
import smallSectionAsset from 'url:./imgs/info-content/small.svg';
import simpleSectionAsset from 'url:./imgs/info-content/simple.svg';
import secureSectionAsset from 'url:./imgs/info-content/secure.svg';
import logoIcon from 'url:./imgs/demos/icon-demo-logo.png';
import logoWithText from 'url:./imgs/pixkee_logo.png';
import * as style from './style.css';
import 'shared/custom-els/snack-bar';

const demos = [
  {
    description: 'Large photo',
    size: '2.8MB',
    filename: 'photo.jpg',
    url: largePhoto,
    iconUrl: largePhotoIcon,
  },
  {
    description: 'Artwork',
    size: '2.9MB',
    filename: 'art.jpg',
    url: artwork,
    iconUrl: artworkIcon,
  },
  {
    description: 'Device screen',
    size: '1.6MB',
    filename: 'pixel3.png',
    url: deviceScreen,
    iconUrl: deviceScreenIcon,
  },
  {
    description: 'SVG icon',
    size: '13KB',
    filename: 'squoosh.svg',
    url: logo,
    iconUrl: logoIcon,
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

const installButtonSource = 'introInstallButton-Blue';
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
  onFile?: (file: File) => void;
  showSnack?: SnackBarElement['showSnackbar'];
  onFeedbackClick?: () => void;
}
interface State {
  fetchingDemoIndex?: number;
  beforeInstallEvent?: BeforeInstallPromptEvent;
}

export default class Intro extends Component<Props, State> {
  state: State = {};
  private fileInput?: HTMLInputElement;
  private installingViaButton = false;

  componentDidMount() {
    window.addEventListener(
      'beforeinstallprompt',
      this.onBeforeInstallPromptEvent,
    );
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  componentWillUnmount() {
    window.removeEventListener(
      'beforeinstallprompt',
      this.onBeforeInstallPromptEvent,
    );
    window.removeEventListener('appinstalled', this.onAppInstalled);
  }

  private onFileChange = (event: Event): void => {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    this.fileInput!.value = '';
    this.props.onFile!(file);
  };

  private onOpenClick = () => {
    this.fileInput!.click();
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

  private onBeforeInstallPromptEvent = (event: BeforeInstallPromptEvent) => {
    event.preventDefault();
    this.setState({ beforeInstallEvent: event });
    const gaEventInfo = {
      eventCategory: 'pwa-install',
      eventAction: 'promo-shown',
      nonInteraction: true,
    };
    ga('send', 'event', gaEventInfo);
  };

  private onInstallClick = async (event: Event) => {
    const beforeInstallEvent = this.state.beforeInstallEvent;
    if (!beforeInstallEvent) return;
    this.installingViaButton = true;
    beforeInstallEvent.prompt();
    const { outcome } = await beforeInstallEvent.userChoice;
    const gaEventInfo = {
      eventCategory: 'pwa-install',
      eventAction: 'promo-clicked',
      eventLabel: installButtonSource,
      eventValue: outcome === 'accepted' ? 1 : 0,
    };
    ga('send', 'event', gaEventInfo);
    if (outcome === 'dismissed') {
      this.installingViaButton = false;
    }
  };

  private onAppInstalled = () => {
    this.setState({ beforeInstallEvent: undefined });
    if (document.hidden) return;
    const source = this.installingViaButton ? installButtonSource : 'browser';
    ga('send', 'event', 'pwa-install', 'installed', source);
    this.installingViaButton = false;
  };

  private onPasteClick = async () => {
    let clipboardItems: ClipboardItem[];
    try {
      clipboardItems = await navigator.clipboard.read();
    } catch (err) {
      this.props.showSnack!(`No permission to access clipboard`);
      return;
    }
    const blob = await getImageClipboardItem(clipboardItems);
    if (!blob) {
      this.props.showSnack!(`No image found in the clipboard`);
      return;
    }
    this.props.onFile!(new File([blob], 'image.unknown'));
  };

  render(
    { }: Props,
    { fetchingDemoIndex, beforeInstallEvent }: State,
  ) {
    return (
      <div class={style.page}>
        <input
          class={style.hide}
          ref={linkRef(this, 'fileInput')}
          type="file"
          onChange={this.onFileChange}
        />

        {/* Header */}
        <header class={style.header}>
          <div class={style.headerInner}>
            <img class={style.headerLogo} src={logoWithText} alt="Pixkee" height="40" />
            <nav class={style.headerNav}>
              <button class={style.navLink} onClick={this.props.onFeedbackClick}>
                Guestbook
              </button>
              {beforeInstallEvent && (
                <button class={style.navButton} onClick={this.onInstallClick}>
                  Install
                </button>
              )}
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section class={style.hero}>
          <div class={style.heroContent}>
            <h1 class={style.heroTitle}>
              Compress images <span class={style.heroHighlight}>instantly</span>
            </h1>
            <p class={style.heroSubtitle}>
              The ultimate image optimizer. Reduce file sizes without losing quality.
            </p>

            {/* Upload Area */}
            <div class={style.uploadArea} onClick={this.onOpenClick}>
              <div class={style.uploadIcon}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M19 7v3h-2V7h-3V5h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5a2 2 0 00-2 2v12c0 1.1.9 2 2 2h12a2 2 0 002-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" />
                </svg>
              </div>
              <p class={style.uploadText}>
                <strong>Drop image here</strong> or click to browse
              </p>
              {supportsClipboardAPI && (
                <button class={style.pasteButton} onClick={(e) => { e.stopPropagation(); this.onPasteClick(); }}>
                  or paste from clipboard
                </button>
              )}
            </div>

            {/* Demo Images */}
            <div class={style.demoSection}>
              <p class={style.demoLabel}>Or try a sample:</p>
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
        </section>

        {/* Features Section */}
        <section class={style.features}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>Why Choose Squoosh?</h2>
            <div class={style.featureGrid}>
              {features.map((feature) => (
                <div class={style.featureCard}>
                  <span class={style.featureIcon}>{feature.icon}</span>
                  <h3 class={style.featureTitle}>{feature.title}</h3>
                  <p class={style.featureDesc}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section class={style.howItWorks}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>How It Works</h2>
            <div class={style.stepsGrid}>
              {steps.map((step, i) => (
                <div class={style.stepCard}>
                  <div class={style.stepNumber}>{step.number}</div>
                  <h3 class={style.stepTitle}>{step.title}</h3>
                  <p class={style.stepDesc}>{step.description}</p>
                  {i < steps.length - 1 && <div class={style.stepArrow}>→</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section class={style.formats}>
          <div class={style.container}>
            <h2 class={style.sectionTitle}>Supported Formats</h2>
            <div class={style.formatGrid}>
              {formats.map((format) => (
                <div class={style.formatBadge} style={{ '--format-color': format.color }}>
                  {format.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section (Small / Simple / Secure) */}
        <section class={style.benefits}>
          <div class={style.container}>
            <div class={style.benefitCard}>
              <div class={style.benefitImage}>
                <img src={smallSectionAsset} alt="Small file sizes" width="300" />
              </div>
              <div class={style.benefitContent}>
                <h2 class={style.benefitTitle}>Small</h2>
                <p class={style.benefitDesc}>
                  Smaller images mean faster load times. Squoosh can reduce
                  file size and maintain high quality.
                </p>
              </div>
            </div>

            <div class={style.benefitCard}>
              <div class={style.benefitContent}>
                <h2 class={style.benefitTitle}>Simple</h2>
                <p class={style.benefitDesc}>
                  Open your image, inspect the differences, then save
                  instantly. Feeling adventurous? Adjust the settings for even
                  smaller files.
                </p>
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
                <h2 class={style.benefitTitle}>Secure</h2>
                <p class={style.benefitDesc}>
                  Worried about privacy? Images never leave your device since
                  Squoosh does all the work locally.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer class={style.footer}>
          <div class={style.container}>
            <p>© 2026 Squoosh. Made with ❤️ for the web.</p>
          </div>
        </footer>

        <snack-bar ref={linkRef(this, 'snackbar')} />
      </div>
    );
  }
}
