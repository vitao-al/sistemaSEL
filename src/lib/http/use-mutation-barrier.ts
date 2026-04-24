'use client';

import { useEffect, useState } from 'react';
import { isMutationPipelineBlocked, subscribeMutationPipeline } from './mutation-pipeline';

/**
 * Indica quando mutações estão em fila ou em intervalo de espera (10s após conclusão).
 */
export function useMutationBarrier() {
  const [blocked, setBlocked] = useState(isMutationPipelineBlocked);

  useEffect(() => {
    return subscribeMutationPipeline(state => {
      setBlocked(state.busy || state.coolingDown);
    });
  }, []);

  return blocked;
}
