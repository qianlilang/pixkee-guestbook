import { h, Component } from 'preact';
import * as style from 'client/lazy-app/Compress/Options/style.css';
import Range from 'client/lazy-app/Compress/Options/Range';
import { Language, translations } from 'client/lazy-app/i18n';

interface EncodeOptions {
  quality: number;
}

interface Props {
  options: EncodeOptions;
  onChange(newOptions: EncodeOptions): void;
  lang: Language;
}

interface QualityOptionArg {
  min?: number;
  max?: number;
  step?: number;
}

type Constructor<T extends {} = {}> = new (...args: any[]) => T;

// TypeScript requires an exported type for returned classes. This serves as the
// type for the class returned by `qualityOption`.
export interface QualityOptionsInterface extends Component<Props, {}> { }

export function qualityOption(
  opts: QualityOptionArg = {},
): Constructor<QualityOptionsInterface> {
  const { min = 0, max = 100, step = 1 } = opts;

  class QualityOptions extends Component<Props, {}> {
    onChange = (event: Event) => {
      const el = event.currentTarget as HTMLInputElement;
      this.props.onChange({ quality: Number(el.value) });
    };

    render({ options, lang }: Props) {
      const t = translations[lang].avif;

      return (
        <div class={style.optionsSection}>
          <div class={style.optionOneCell}>
            <Range
              name="quality"
              min={min}
              max={max}
              step={step || 'any'}
              value={options.quality}
              onInput={this.onChange}
            >
              {t.quality}
            </Range>
          </div>
        </div>
      );
    }
  }

  return QualityOptions;
}
