export type MakeSignalKeyInput = {
  sourceType: "official" | "portal"
  source: string
  type: string
  geoType: string
  geoId: string
  segment: string
  timeframe: string
  anchor: string // window_end or as_of_date
}

export function makeSignalKey(input: MakeSignalKeyInput) {
  return [
    input.sourceType,
    input.source,
    input.type,
    input.geoType,
    input.geoId,
    input.segment,
    input.timeframe,
    input.anchor,
  ].join("|")
}


