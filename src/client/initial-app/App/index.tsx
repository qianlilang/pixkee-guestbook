import type { FileDropEvent } from 'file-drop-element';
import type SnackBarElement from 'shared/custom-els/snack-bar';
import type { SnackOptions } from 'shared/custom-els/snack-bar';
import { Language } from 'client/lazy-app/i18n';

import { h, Component } from 'preact';

import { linkRef } from 'shared/prerendered-app/util';
import * as style from './style.css';
import 'add-css:./style.css';
import 'file-drop-element';
import 'shared/custom-els/snack-bar';
import Intro from 'shared/prerendered-app/Intro';
import 'shared/custom-els/loading-spinner';

const ROUTE_EDITOR = '/editor';
const ROUTE_FEEDBACK = '/feedback';

const compressPromise = import('client/lazy-app/Compress');
const swBridgePromise = import('client/lazy-app/sw-bridge');
const feedbackPromise = import('client/lazy-app/Feedback');
const batchPromise = import('client/lazy-app/Batch');

function back() {
  window.history.back();
}

interface Props { }

interface State {
  awaitingShareTarget: boolean;
  file?: File;
  files?: File[];
  isEditorOpen: Boolean;

  isFeedbackOpen: Boolean;
  Compress?: typeof import('client/lazy-app/Compress').default;
  Batch?: typeof import('client/lazy-app/Batch').default;
  Feedback?: typeof import('client/lazy-app/Feedback').default;
  lang: Language;
}

export default class App extends Component<Props, State> {
  state: State = {
    awaitingShareTarget: new URL(location.href).searchParams.has(
      'share-target',
    ),
    isEditorOpen: false,

    isFeedbackOpen: false,
    file: undefined,
    files: undefined,
    Compress: undefined,
    Batch: undefined,
    Feedback: undefined,
    lang: 'en',
  };

  snackbar?: SnackBarElement;

  constructor() {
    super();

    // Initialize Language
    let lang: Language = 'en';
    if (typeof window !== 'undefined') {
      const isZhPath = window.location.pathname === '/zh';
      if (isZhPath) {
        lang = 'zh';
      } else if (window.location.pathname === '/' || window.location.pathname === '') {
        if (navigator.language.startsWith('zh')) {
          lang = 'zh';
          window.history.replaceState({}, '', '/zh');
        }
      }
    }
    this.state.lang = lang;

    this.state.isFeedbackOpen = location.pathname === ROUTE_FEEDBACK;
    if (this.state.isFeedbackOpen) this.loadFeedback();

    compressPromise
      .then((module) => {
        this.setState({ Compress: module.default });
      })
      .catch(() => {
        this.showSnack('Failed to load app');
      });

    swBridgePromise.then(async ({ offliner, getSharedImage }) => {
      offliner(this.showSnack);
      if (!this.state.awaitingShareTarget) return;
      const file = await getSharedImage();
      // Remove the ?share-target from the URL
      history.replaceState('', '', '/');
      this.openEditor();
      this.setState({ file, awaitingShareTarget: false });
    });

    // Since iOS 10, Apple tries to prevent disabling pinch-zoom. This is great in theory, but
    // really breaks things on Pixkee, as you can easily end up zooming the UI when you mean to
    // zoom the image. Once you've done this, it's really difficult to undo. Anyway, this seems to
    // prevent it.
    document.body.addEventListener('gesturestart', (event: any) => {
      event.preventDefault();
    });

    window.addEventListener('popstate', this.onPopState);
  }

  private onFileDrop = ({ files }: FileDropEvent) => {
    if (!files || files.length === 0) return;
    if (files.length === 1) {
      const file = files[0];
      this.openEditor();
      this.setState({ file });
    } else {
      this.loadBatch();
      this.setState({ files: Array.from(files) });
    }
  };

  private onIntroPickFile = (files: File[] | File) => {
    if (Array.isArray(files)) {
      this.loadBatch();
      this.setState({ files });
    } else {
      this.openEditor();
      this.setState({ file: files });
    }
  };

  private showSnack = (
    message: string,
    options: SnackOptions = {},
  ): Promise<string> => {
    if (!this.snackbar) throw Error('Snackbar missing');
    return this.snackbar.showSnackbar(message, options);
  };

  private onPopState = () => {
    this.setState({
      isEditorOpen: location.pathname === ROUTE_EDITOR,
      isFeedbackOpen: location.pathname === ROUTE_FEEDBACK,
    });
    if (location.pathname === ROUTE_FEEDBACK) this.loadFeedback();
  };

  private openEditor = () => {
    if (this.state.isEditorOpen) return;
    // Change path, but preserve query string.
    const editorURL = new URL(location.href);
    editorURL.pathname = ROUTE_EDITOR;
    history.pushState(null, '', editorURL.href);
    this.setState({ isEditorOpen: true, isFeedbackOpen: false });
  };

  private openFeedback = () => {
    if (this.state.isFeedbackOpen) return;
    const feedbackURL = new URL(location.href);
    feedbackURL.pathname = ROUTE_FEEDBACK;
    history.pushState(null, '', feedbackURL.href);
    this.setState({ isFeedbackOpen: true, isEditorOpen: false });
    this.loadFeedback();
  };

  private loadFeedback = () => {
    if (this.state.Feedback) return;
    feedbackPromise.then((module) => {
      this.setState({ Feedback: module.default });
    });
  };

  private closeFeedback = () => {
    window.history.back();
  };

  private loadBatch = () => {
    if (this.state.Batch) return;
    batchPromise.then((module) => {
      this.setState({ Batch: module.default });
    });
  };

  private setLang = (lang: Language) => {
    this.setState({ lang });
    if (lang === 'zh') {
      window.history.pushState({}, '', '/zh');
    } else {
      window.history.pushState({}, '', '/');
    }
  }

  render(
    { }: Props,
    {
      file,
      files,
      isEditorOpen,
      isFeedbackOpen,
      Compress,
      Batch,
      Feedback,
      awaitingShareTarget,
      lang,
    }: State,
  ) {
    const showSpinner = awaitingShareTarget || (isEditorOpen && !Compress);

    return (
      <div class={style.app}>
        <file-drop onfiledrop={this.onFileDrop} class={style.drop}>
          {showSpinner ? (
            <loading-spinner class={style.appLoader} />
          ) : isEditorOpen ? (
            Compress && (
              <Compress file={file!} showSnack={this.showSnack} onBack={back} lang={lang} />
            )
          ) : isFeedbackOpen ? (
            Feedback && <Feedback onBack={this.closeFeedback} lang={lang} />
          ) : (
            <Intro
              onFile={this.onIntroPickFile}
              showSnack={this.showSnack}
              onFeedbackClick={this.openFeedback}
              files={files}
              Batch={Batch}
              lang={lang}
              setLang={this.setLang}
            />
          )}
          <snack-bar ref={linkRef(this, 'snackbar')} />
        </file-drop>
      </div>
    );
  }
}
