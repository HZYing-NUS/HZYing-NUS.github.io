export const RESOURCE_ASSISTANT_SOURCE_REGISTRY = [
  'resource',
  'collection',
  'legacy_post',
] as const;
export function isResourceAssistantSourceType(value: string) {
  return (RESOURCE_ASSISTANT_SOURCE_REGISTRY as readonly string[]).includes(
    value
  );
}
