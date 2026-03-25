import { parseStringPromise } from 'xml2js'

interface ParsedJson {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | ParsedJson
    | ParsedJson[]
    | string[]
}

const parseXmlToJson = async (
  xmlString: string,
  ctx: Context
): Promise<ParsedJson> => {
  const {
    vtex: { logger },
  } = ctx

  try {
    const result = await parseStringPromise(xmlString, {
      explicitArray: false, // Prevents arrays for single elements
      mergeAttrs: true, // Merges XML attributes into the parent object
      trim: true, // Trims whitespace
    })

    return result
  } catch (error) {
    logger.error(
      `Error occured during parsing input raw xml to JSON - ${error}`
    )

    throw error
  }
}

export default parseXmlToJson
