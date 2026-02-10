import { EncodeOptions } from '../shared/meta';
import type WorkerBridge from 'client/lazy-app/worker-bridge';
import { h, Component } from 'preact';
import {
  inputFieldChecked,
  inputFieldValueAsNumber,
  preventDefault,
} from 'client/lazy-app/util';
import * as style from 'client/lazy-app/Compress/Options/style.css';
import Range from 'client/lazy-app/Compress/Options/Range';
import Checkbox from 'client/lazy-app/Compress/Options/Checkbox';
import { Language, translations } from 'client/lazy-app/i18n';

export async function encode(
  signal: AbortSignal,
  workerBridge: WorkerBridge,
  imageData: ImageData,
  options: EncodeOptions,
) {
  return workerBridge.oxipngEncode(signal, imageData, options);
}

type Props = {
  options: EncodeOptions;
  onChange(newOptions: EncodeOptions): void;
  lang: Language;
};

export class Options extends Component<Props, {}> {
  onChange = (event: Event) => {
    const form = (event.currentTarget as HTMLInputElement).closest(
      'form',
    ) as HTMLFormElement;

    const options: EncodeOptions = {
      level: inputFieldValueAsNumber(form.level),
      interlace: inputFieldChecked(form.interlace),
    };
    this.props.onChange(options);
  };

  // Wait, I am replacing the whole file content or chunks?
  // The Instruction says "EndLine: 64". The file is 64 lines long.
  // So I am replacing the whole file potentially.

  // Let's use `inputFieldChecked` properly.

  render({ options, lang }: Props) {
    const t = translations[lang].oxiPNG;
    return (
      <form class={style.optionsSection} onSubmit={preventDefault}>
        <label class={style.optionToggle}>
          {t.interlace}
          <Checkbox
            name="interlace"
            checked={options.interlace}
            onChange={this.onChange}
          />
        </label>
        <div class={style.optionOneCell}>
          <Range
            name="level"
            min="0"
            max="6"
            step="1"
            value={options.level}
            onInput={this.onChange}
          >
            {t.effort}
          </Range>
        </div>
      </form>
    );
  }
}
