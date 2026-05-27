import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Image as ImageIcon,
  Swords,
  Loader2,
  Play,
  AlertCircle,
  Trophy,
  MessageSquareText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComparisonPK } from '@/components/ComparisonPK';
import { usePhotoContext } from '@/contexts/PhotoContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { runStage2 } from '@/services/pipeline/stage2';
import { runStage3 } from '@/services/pipeline/stage3';
import { runAutoCritique } from '@/services/pipeline/autoCritique';
import { cn } from '@/lib/utils';

type StageKey = 'technical' | 'aesthetic' | 'comparison';
type StagePhase = 'preparing' | 'scoring' | 'clustering' | 'finalizing' | 'done';

interface StageRunState {
  running: boolean;
  phase?: StagePhase;
  error?: string;
}

interface Stage2Summary {
  scored: number;
  rejected: number;
  elapsedMs: number;
}

interface Stage3Summary {
  totalClusters: number;
  pkGroups: number;
  finalists: number;
  pendingPK: number;
  elapsedMs: number;
}

export function PipelineProgress() {
  const { t, i18n } = useTranslation();
  const { state, dispatch, counts } = usePhotoContext();
  const { settings } = useSettings();
  const backend = useBackendHealth();

  const [stage2, setStage2] = useState<StageRunState>({ running: false });
  const [stage2Result, setStage2Result] = useState<Stage2Summary | undefined>();

  const [stage3, setStage3] = useState<StageRunState>({ running: false });
  const [stage3Result, setStage3Result] = useState<Stage3Summary | undefined>();
  const [pkOpen, setPkOpen] = useState(false);

  const [critiqueProgress, setCritiqueProgress] = useState<
    { running: boolean; done: number; total: number; error?: string } | undefined
  >();

  // Photos rejected by Stage 2 that don't yet have an LLM critique attached.
  const aiRejectedWithoutCritique = useMemo(
    () =>
      state.photos.filter(
        (p) => p.status === 'rejected_ai' && !p.critique,
      ),
    [state.photos],
  );

  // Live count of multi-photo clusters still waiting for PK.
  const pkClustersWaiting = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of state.photos) {
      if (p.status === 'pending' && p.clusterId !== undefined) {
        counts.set(p.clusterId, (counts.get(p.clusterId) ?? 0) + 1);
      }
    }
    let groups = 0;
    for (const n of counts.values()) if (n >= 2) groups += 1;
    return groups;
  }, [state.photos]);

  if (counts.total === 0) return null;

  const stage1Passed = counts.total - counts.rejected_tech;
  const stage1Pct = counts.total > 0 ? (stage1Passed / counts.total) * 100 : 0;
  const backendReady = backend.status === 'ready';
  const pendingPhotos = state.photos.filter((p) => p.status === 'pending');
  const stage2Eligible = pendingPhotos.length > 0;

  const handleRunStage2 = async () => {
    if (!stage2Eligible || !backendReady || stage2.running) return;
    setStage2({ running: true, phase: 'preparing' });
    setStage2Result(undefined);
    try {
      const result = await runStage2(
        pendingPhotos,
        settings.stage2RejectionRatio,
        dispatch,
        (p) => setStage2((prev) => ({ ...prev, phase: p.phase as StagePhase })),
      );
      setStage2Result(result);
      setStage2({ running: false, phase: 'done' });
    } catch (err) {
      setStage2({ running: false, error: (err as Error).message });
    }
  };

  const handleExplainRejections = async () => {
    if (
      aiRejectedWithoutCritique.length === 0 ||
      critiqueProgress?.running
    ) {
      return;
    }
    const provider = settings.llmProviderId;
    const apiKey = settings.llmApiKey;
    if (provider !== 'claude-cli' && !apiKey) {
      setCritiqueProgress({
        running: false,
        done: 0,
        total: 0,
        error: t('critique.apiKeyMissing'),
      });
      return;
    }
    setCritiqueProgress({ running: true, done: 0, total: aiRejectedWithoutCritique.length });
    try {
      await runAutoCritique(
        aiRejectedWithoutCritique,
        {
          provider,
          apiKey,
          language: i18n.language,
          concurrency: provider === 'claude-cli' ? 1 : 3,
          onProgress: (done, total) =>
            setCritiqueProgress((prev) => ({
              running: done < total,
              done,
              total,
              error: prev?.error,
            })),
        },
        dispatch,
      );
      setCritiqueProgress((prev) =>
        prev ? { ...prev, running: false } : undefined,
      );
    } catch (err) {
      setCritiqueProgress((prev) =>
        prev
          ? { ...prev, running: false, error: (err as Error).message }
          : { running: false, done: 0, total: 0, error: (err as Error).message },
      );
    }
  };

  const handleRunStage3 = async () => {
    if (!stage2Eligible || !backendReady || stage3.running) return;
    setStage3({ running: true, phase: 'preparing' });
    setStage3Result(undefined);
    try {
      const result = await runStage3(
        pendingPhotos,
        settings.stage3ClusterEps,
        dispatch,
        (p) => setStage3((prev) => ({ ...prev, phase: p.phase as StagePhase })),
      );
      setStage3Result(result);
      setStage3({ running: false, phase: 'done' });
    } catch (err) {
      setStage3({ running: false, error: (err as Error).message });
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StageCard stageNum={1} stageKey="technical" icon={ImageIcon} active>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>
                {t('pipeline.passed')}:{' '}
                <span className="font-semibold text-emerald-600">{stage1Passed}</span>
              </span>
              <span>
                {t('pipeline.rejected')}:{' '}
                <span className="font-semibold text-destructive">{counts.rejected_tech}</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${stage1Pct}%` }}
              />
            </div>
          </StageCard>

          <StageCard stageNum={2} stageKey="aesthetic" icon={Sparkles} active>
            <StageStatus running={stage2.running} phase={stage2.phase} error={stage2.error}>
              {stage2Result ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>
                      {t('pipeline.scored')}:{' '}
                      <span className="font-semibold">{stage2Result.scored}</span>
                    </span>
                    <span>
                      {t('pipeline.rejected')}:{' '}
                      <span className="font-semibold text-amber-600">
                        {stage2Result.rejected}
                      </span>
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70">
                    {(stage2Result.elapsedMs / 1000).toFixed(1)}s
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('pipeline.aestheticHint')}</p>
              )}
            </StageStatus>

            <div className="flex gap-2 flex-wrap mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunStage2}
                disabled={!stage2Eligible || !backendReady || stage2.running}
              >
                {stage2.running ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-2" />
                )}
                {stage2Result ? t('pipeline.runAgain') : t('pipeline.runAesthetic')}
                <span className="ml-1 opacity-70">({pendingPhotos.length})</span>
              </Button>

              {aiRejectedWithoutCritique.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExplainRejections}
                  disabled={critiqueProgress?.running}
                >
                  {critiqueProgress?.running ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <MessageSquareText className="h-3 w-3 mr-2" />
                  )}
                  {t('pipeline.explainRejections')}
                  <span className="ml-1 opacity-70">
                    ({aiRejectedWithoutCritique.length})
                  </span>
                </Button>
              )}
            </div>

            {!stage2.running &&
              (!backendReady || !stage2Eligible) && (
                <p className="text-[10px] text-amber-600 mt-1">
                  {!backendReady
                    ? t('pipeline.backendOffline')
                    : t('pipeline.allProcessed')}
                </p>
              )}

            {critiqueProgress && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {critiqueProgress.error ? (
                  <span className="text-destructive">{critiqueProgress.error}</span>
                ) : critiqueProgress.running ? (
                  <span>
                    {t('pipeline.explainProgress', {
                      done: critiqueProgress.done,
                      total: critiqueProgress.total,
                    })}
                  </span>
                ) : critiqueProgress.total > 0 ? (
                  <span>
                    {t('pipeline.explainDone', { total: critiqueProgress.total })}
                  </span>
                ) : null}
              </div>
            )}
          </StageCard>

          <StageCard stageNum={3} stageKey="comparison" icon={Swords} active>
            <StageStatus running={stage3.running} phase={stage3.phase} error={stage3.error}>
              {stage3Result ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>
                      {t('pipeline.groups')}:{' '}
                      <span className="font-semibold">{stage3Result.pkGroups}</span>
                    </span>
                    <span>
                      {t('pipeline.autoFinalists')}:{' '}
                      <span className="font-semibold text-emerald-600">
                        {stage3Result.finalists}
                      </span>
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70">
                    {t('pipeline.pendingPK')}: {stage3Result.pendingPK} ·{' '}
                    {(stage3Result.elapsedMs / 1000).toFixed(1)}s
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('pipeline.comparisonHint')}</p>
              )}
            </StageStatus>

            <div className="flex gap-2 flex-wrap mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunStage3}
                disabled={!stage2Eligible || !backendReady || stage3.running}
              >
                {stage3.running ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-2" />
                )}
                {stage3Result ? t('pipeline.runAgain') : t('pipeline.runSimilarity')}
                <span className="ml-1 opacity-70">({pendingPhotos.length})</span>
              </Button>

              {pkClustersWaiting > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setPkOpen(true)}
                  disabled={stage3.running}
                >
                  <Trophy className="h-3 w-3 mr-2" />
                  {t('actions.startPK')}
                  <span className="ml-1 opacity-80">({pkClustersWaiting})</span>
                </Button>
              )}
            </div>

            {!stage3.running &&
              (!backendReady || !stage2Eligible) && (
                <p className="text-[10px] text-amber-600 mt-1">
                  {!backendReady
                    ? t('pipeline.backendOffline')
                    : t('pipeline.allProcessed')}
                </p>
              )}
          </StageCard>
        </div>
      </CardContent>
      <ComparisonPK open={pkOpen} onClose={() => setPkOpen(false)} />
    </Card>
  );
}

interface StageStatusProps {
  running: boolean;
  phase?: StagePhase;
  error?: string;
  children: React.ReactNode;
}

function StageStatus({ running, phase, error, children }: StageStatusProps) {
  const { t } = useTranslation();
  if (running) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t(`pipeline.phase_${phase ?? 'preparing'}`)}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-start gap-2 text-xs text-destructive">
        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="break-words">{error}</span>
      </div>
    );
  }
  return <>{children}</>;
}

interface StageCardProps {
  stageNum: number;
  stageKey: StageKey;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  children: React.ReactNode;
}

function StageCard({ stageNum, stageKey, icon: Icon, active, children }: StageCardProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3',
        active ? 'border-primary/40 bg-primary/5' : 'border-muted bg-muted/30',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
          <span className="text-sm font-medium">
            {stageNum}. {t(`stage.${stageKey}`)}
          </span>
        </div>
        {!active && (
          <Badge variant="outline" className="text-xs">
            {t('pipeline.comingSoon')}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}
