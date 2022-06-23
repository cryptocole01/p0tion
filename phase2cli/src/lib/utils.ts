import { request } from "@octokit/request"
import { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore"
import ora, { Ora } from "ora"
import figlet from "figlet"
import clear from "clear"
import { FirebaseDocumentInfo, FirebaseServices, Timing } from "../../types/index.js"
import { emojis, firstZkeyIndex, theme } from "./constants.js"
import { initServices } from "./firebase.js"
import { GENERIC_ERRORS, showError } from "./errors.js"

/**
 * Get the Github username for the logged in user.
 * @param token <string> - the Github OAuth 2.0 token.
 * @returns <Promise<string>> - the user Github username.
 */
export const getGithubUsername = async (token: string): Promise<string> => {
  // Get user info from Github APIs.
  const response = await request("GET https://api.github.com/user", {
    headers: {
      authorization: `token ${token}`
    }
  })

  if (response) return response.data.login
  throw new Error(`There was an error retrieving your Github username. Please try again later.`)
}

/**
 * Publish a new attestation through a Github Gist.
 * @param token <string> - the Github OAuth 2.0 token.
 * @param content <string> - the content of the attestation.
 * @param ceremonyPrefix <string> - the ceremony prefix.
 * @param ceremonyTitle <string> - the ceremony title.
 */
export const publishGist = async (
  token: string,
  content: string,
  ceremonyPrefix: string,
  ceremonyTitle: string
): Promise<string> => {
  const response = await request("POST /gists", {
    description: `Attestation for ${ceremonyTitle} MPC Phase 2 Trusted Setup ceremony`,
    public: true,
    files: {
      [`${ceremonyPrefix}_attestation.txt`]: {
        content
      }
    },
    headers: {
      authorization: `token ${token}`
    }
  })

  if (response && response.data.html_url) return response.data.html_url
  throw new Error(`There were errors when publishing a Gist from your Github account.`)
}

/**
 * Helper for obtaining uid and data for query document snapshots.
 * @param queryDocSnap <Array<QueryDocumentSnapshot>> - the array of query document snapshot to be converted.
 * @returns Array<FirebaseDocumentInfo>
 */
export const fromQueryToFirebaseDocumentInfo = (
  queryDocSnap: Array<QueryDocumentSnapshot>
): Array<FirebaseDocumentInfo> =>
  queryDocSnap.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data()
  }))

/**
 * Return a custom spinner.
 * @param text <string> - the text that should be displayed as spinner status.
 * @param spinnerLogo <any> - the logo.
 * @returns <Ora> - a new Ora custom spinner.
 */
export const customSpinner = (text: string, spinnerLogo: any): Ora =>
  ora({
    text,
    spinner: spinnerLogo
  })

/**
 * Get a value from a key information about a circuit.
 * @param circuitInfo <string> - the stringified content of the .r1cs file.
 * @param rgx <RegExp> - regular expression to match the key.
 * @returns <string>
 */
export const getCircuitMetadataFromR1csFile = (circuitInfo: string, rgx: RegExp): string => {
  // Match.
  const matchInfo = circuitInfo.match(rgx)

  if (!matchInfo) throw new Error(`Requested information was not found in the .r1cs file!`)

  // Split and return the value.
  return matchInfo[0].split(":")[1].replace(" ", "").split("#")[0].replace("\n", "")
}

/**
 * Return the necessary Power of Tau "powers" given the number of circuits constraints.
 * @param constraints <number> - the number of circuit contraints
 * @returns <number>
 */
export const estimatePoT = (constraints: number): number => {
  let power = 2
  let pot = 2 ** power

  while (constraints * 2 > pot) {
    power += 1
    pot = 2 ** power
  }

  return power
}

/**
 * Get the powers from pot file name
 * @dev the pot files must follow these convention (i_am_a_pot_file_09.ptau) where the numbers before '.ptau' are the powers.
 * @param potFileName <string>
 * @returns <number>
 */
export const extractPoTFromFilename = (potFileName: string): number =>
  Number(potFileName.split("_").pop()?.split(".").at(0))

/**
 * Extract a prefix (like_this) from a provided string with special characters and spaces.
 * @dev replaces all symbols and whitespaces with underscore.
 * @param str <string>
 * @returns <string>
 */
export const extractPrefix = (str: string): string =>
  // eslint-disable-next-line no-useless-escape
  str.replace(/[`\s~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "_").toLowerCase()

/**
 * Format the next zkey index.
 * @param progress <number> - the progression in zkey index (= contributions).
 * @returns <string>
 */
export const formatZkeyIndex = (progress: number): string => {
  let index = progress.toString()

  while (index.length < firstZkeyIndex.length) {
    index = `0${index}`
  }

  return index
}

/**
 * Convert milliseconds to seconds.
 * @param millis <number>
 * @returns <number>
 */
export const convertMillisToSeconds = (millis: number): number => Number((millis / 1000).toFixed(2))

/**
 * Return the current server timestamp in milliseconds.
 * @returns <number>
 */
export const getServerTimestampInMillis = (): number => Timestamp.now().toMillis()

/**
 * Return some random values to be used as entropy.
 * @dev took inspiration from here https://github.com/glamperd/setup-mpc-ui/blob/master/client/src/state/Compute.tsx#L112.
 * @returns <Uint8Array>
 */
export const getRandomEntropy = (): Uint8Array => new Uint8Array(64).map(() => Math.random() * 256)

/**
 * Bootstrap whatever is needed for a new command execution (clean terminal, print header, init Firebase services).
 * @returns <Promise<FirebaseServices>>
 */
export const bootstrapCommandExec = async (): Promise<FirebaseServices> => {
  // Clean terminal window.
  clear()

  // Print header.
  console.log(theme.magenta(figlet.textSync("Phase 2 cli", { font: "Ogre" })))

  // Initialize Firebase services
  return initServices()
}

/**
 * Gracefully terminate the command execution
 * @params ghUsername <string> - the Github username of the user.
 */
export const terminate = async (ghUsername: string) => {
  console.log(`\nSee you ${theme.bold(`@${ghUsername}`)} ${emojis.wave}`)

  process.exit(0)
}

/**
 * Make a new countdown and throws an error when time is up.
 * @param durationInSeconds <number> - the amount of time to be counted in seconds.
 * @param intervalInSeconds <number> - update interval in seconds.
 */
export const createExpirationCountdown = (durationInSeconds: number, intervalInSeconds: number) => {
  let seconds = durationInSeconds <= 60 ? durationInSeconds : 60

  setInterval(() => {
    try {
      if (durationInSeconds !== 0) {
        // Update times.
        durationInSeconds -= intervalInSeconds
        seconds -= intervalInSeconds

        if (seconds % 60 === 0) seconds = 0

        process.stdout.write(
          `Expires in ${theme.bold(theme.magenta(`00:${Math.floor(durationInSeconds / 60)}:${seconds}`))}\r`
        )
      } else throw new Error(`Time's up!`)
    } catch (err: any) {
      // Workaround to the \r.
      process.stdout.write(`\n\n`)
      showError(GENERIC_ERRORS.GENERIC_COUNTDOWN_EXPIRATION, true)
    }
  }, intervalInSeconds * 1000)
}

/**
 * Extract from milliseconds the seconds, minutes and hours.
 * @param millis <number>
 * @returns <Timing>
 */
export const getSecondsMinutesHoursFromMillis = (millis: number): Timing => {
  const seconds = convertMillisToSeconds(millis)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  return { seconds, minutes, hours }
}

/**
 * Return a string with double digits if the amount is one digit only.
 * @param amount <number>
 * @returns <string>
 */
export const convertToDoubleDigits = (amount: number): string => (amount < 10 ? `0${amount}` : amount.toString())

/**
 * Sleeps the function execution for given millis.
 * @dev to be used in combination with loggers when writing data into files.
 * @param ms <number> - sleep amount in milliseconds
 * @returns <Promise<unknown>>
 */
export const sleep = (ms: number): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, ms))