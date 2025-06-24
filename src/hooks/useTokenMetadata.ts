
import { useCurrentTokenMetadata } from './useCurrentTokenMetadata';
import { useTokenMetadataUpdate } from './useTokenMetadataUpdate';

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

  const calculateActualFee = async (): Promise<number> => {
    return 0.01;
  };

  // Refresh current metadata after successful update
  const updateTokenMetadataWithRefresh = async (params: Parameters<typeof updateTokenMetadata>[0]) => {
    const result = await updateTokenMetadata(params);
    if (result.success) {
      await fetchCurrentTokenMetadata();
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
    currentMetadata
  };
};
