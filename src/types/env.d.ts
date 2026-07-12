interface ImportMetaEnv {
  readonly VITE_ADMOB_ANDROID_APP_ID?: string;
  readonly VITE_ADMOB_REWARDED_REVIVE_ID?: string;
  readonly VITE_ADMOB_REWARDED_DOUBLE_CREDITS_ID?: string;
  readonly VITE_ADMOB_REWARDED_REROLL_ID?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
