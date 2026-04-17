import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import { PhotoProvider } from '@/contexts/PhotoContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PhotoUploader } from '@/components/PhotoUploader';
import { PhotoGallery } from '@/components/PhotoGallery';
import { FilterBar } from '@/components/FilterBar';
import { SettingsDialog } from '@/components/SettingsDialog';

function AppContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{t('app.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('app.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SettingsDialog />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="space-y-6">
          <PhotoUploader />
          <FilterBar />
          <PhotoGallery />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Photo Selector © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <PhotoProvider>
        <AppContent />
      </PhotoProvider>
    </SettingsProvider>
  );
}

export default App;
