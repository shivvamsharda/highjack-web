
import { useCurrentTokenMetadata } from './useCurrentTokenMetadata';
import { useTokenMetadataUpdate } from './useTokenMetadataUpdate';
import { useHijackFeeContext } from '@/contexts/HijackFeeContext';

export const useTokenMetadata = () => {
  const {
    fetchCurrentTokenMetadata,
    isFetchingCurrent,
    currentMetadata
  } = useCurrentTokenMetadata();

  const {
    updateTokenMetadata,
    isUpdating,
    progress
  } = useTokenMetadataUpdate();

  const {
    feeInfo,
    isLoading: isFeeLoading,
    error: feeError,
    refreshFee
  } = useHijackFeeContext();

  const calculateActualFee = async (): Promise<number> => {
    return feeInfo?.currentFee || 0.1;
  };

  // Refresh current metadata and fee after successful update
  const updateTokenMetadataWithRefresh = async (params: Parameters<typeof updateTokenMetadata>[0]) => {
    const result = await updateTokenMetadata(params);
    if (result.success) {
      await fetchCurrentTokenMetadata();
      await refreshFee();
    }
    return result;
  };

  return {
    updateTokenMetadata: updateTokenMetadataWithRefresh,
    fetchCurrentTokenMetadata,
    calculateActualFee,
    isUpdating,
    isFetchingCurrent,
    progress,
    currentMetadata,
    feeInfo,
    isFeeLoading,
    feeError,
    refreshFee
  };
};
