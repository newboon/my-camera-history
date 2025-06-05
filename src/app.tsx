import { FileUploader } from './components/FileUploader';
import { UsedCameras } from './components/UsedCameras';
import { BackgroundBlur } from './components/common/BackgroundBlur';
import { LanguageToggle } from './components/common/LanguageToggle';
import { FileProvider } from './contexts/FileContext';
import { useTranslation, Trans } from 'react-i18next';
import 'virtual:uno.css';

export const App = () => {
  const { t } = useTranslation();

  return (
    <FileProvider>
      <div className="flex flex-col p-4 md:p-8">
        <BackgroundBlur />

        <div className="relative mx-auto max-w-3xl w-full">
          <header className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-medium text-gray-900 md:text-4xl">
              {t('title')}
            </h1>
            <p className="text-gray-600">
              {t('subtitle')}{' '}
              <i className="i-twemoji-camera-with-flash align-top" />
            </p>
          </header>

          <main className="space-y-10 mb-12">
            <FileUploader />
            <UsedCameras />
            {/* <ExifViewer /> */}
          </main>
        </div>

        <footer className="relative space-y-2 text-center text-sm text-gray-500 break-keep text-balance">
          <p>{t('footer.privacy')}</p>
          <p className="space-x-1">
            <a
              href="https://github.com/newboon/my-camera-history/"
              target="_blank"
              className="underline"
            >
              GitHub
            </a>
            {' / '}
            <LanguageToggle />
          </p>
          <p>
            <Trans i18nKey="footer.basedOn">
              This app is based on <a href="https://snap-scope.shj.rip/" target="_blank" className="underline">Snap Scope</a> by shj.
            </Trans>
          </p>
        </footer>
      </div>
    </FileProvider>
  );
};
