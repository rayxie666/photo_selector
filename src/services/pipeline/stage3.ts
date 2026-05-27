// Stage 3 — CLIP similarity clustering.
// Sends every still-`pending` photo to /api/similarity/cluster. Singleton clusters
// graduate to `finalist`; multi-photo clusters keep `pending` status with a clusterId
// set so the PK UI (chapter 9) can pick them up.

import { api } from '@/services/api';
import type { Photo, PhotoAction } from '@/types';

interface Stage3Progress {
  phase: 'preparing' | 'clustering' | 'finalizing' | 'done';
}

interface Stage3Result {
  totalClusters: number;
  pkGroups: number;       // multi-photo clusters
  finalists: number;      // photos auto-promoted (singletons)
  pendingPK: number;      // photos still pending awaiting PK
  elapsedMs: number;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export async function runStage3(
  pendingPhotos: Photo[],
  eps: number,
  dispatch: React.Dispatch<PhotoAction>,
  onProgress?: (p: Stage3Progress) => void,
): Promise<Stage3Result> {
  if (pendingPhotos.length === 0) {
    return {
      totalClusters: 0,
      pkGroups: 0,
      finalists: 0,
      pendingPK: 0,
      elapsedMs: 0,
    };
  }

  onProgress?.({ phase: 'preparing' });

  const inputs = await Promise.all(
    pendingPhotos.map(async (p) => ({
      id: p.id,
      blob: await dataUrlToBlob(p.thumbnailUrl),
      filename: p.name,
    })),
  );

  onProgress?.({ phase: 'clustering' });

  const response = await api.similarityCluster(inputs, eps);

  onProgress?.({ phase: 'finalizing' });

  dispatch({
    type: 'SET_CLUSTERS',
    payload: response.items.map(({ id, cluster_id }) => ({ id, clusterId: cluster_id })),
  });

  // Group photo ids by cluster id.
  const groups = new Map<number, string[]>();
  for (const { id, cluster_id } of response.items) {
    const arr = groups.get(cluster_id);
    if (arr) arr.push(id);
    else groups.set(cluster_id, [id]);
  }

  let finalists = 0;
  let pendingPK = 0;
  for (const [, ids] of groups) {
    if (ids.length === 1) {
      finalists += 1;
      dispatch({
        type: 'SET_STATUS',
        payload: { id: ids[0], status: 'finalist' },
      });
    } else {
      pendingPK += ids.length;
    }
  }

  onProgress?.({ phase: 'done' });

  return {
    totalClusters: response.n_clusters,
    pkGroups: response.n_groups,
    finalists,
    pendingPK,
    elapsedMs: response.elapsed_ms,
  };
}
