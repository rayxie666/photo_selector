import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ mode: ThemeMode; icon: React.ComponentType<{ className?: string }> }> = [
  { mode: 'system', icon: Monitor },
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
];

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  return (
    <div
      className="inline-flex rounded-md border border-input bg-background p-0.5"
      role="group"
      aria-label={t('theme.label')}
    >
      {OPTIONS.map(({ mode: m, icon: Icon }) => {
        const active = mode === m;
        return (
          <Button
            key={m}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="icon"
            className={cn('h-8 w-8', active && 'pointer-events-none')}
            onClick={() => setMode(m)}
            title={t(`theme.${m}`)}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
