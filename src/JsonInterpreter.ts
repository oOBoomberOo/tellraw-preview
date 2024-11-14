import { Range, TextDocument } from "vscode";
import * as z from "zod";

export function parseJsonMessage(text: string): JsonMessage {
    const input = text
        .replace(/\\[ \t]*(\r\n|\n)/g, "")
        .replace(/[\t\r\n]/g, "");
    const json = JSON.parse(input);
    return JsonMessage.parse(json);
}

const JsonMessage: z.ZodType<JsonMessage> = z.lazy(() =>
    z.union([
        TextJsonMessage,
        SelectorJsonMessage,
        KeybindJsonMessage,
        TranslateJsonMessage,
        ScoreboardJsonMessage,
        BlockNbtJsonMessage,
        EntityNbtJsonMessage,
        StorageNbtJsonMessage,
        StringJsonMessage,
        z.array(JsonMessage),
    ])
);

const TextJsonMessage = z.object({
    type: z.optional(z.literal("text")),
    text: z.string(),
});

const StringJsonMessage = z.string();

const SelectorJsonMessage = z.object({
    type: z.optional(z.literal("selector")),
    selector: z.string(),
    separator: z.optional(JsonMessage),
});

const KeybindJsonMessage = z.object({
    type: z.optional(z.literal("keybind")),
    keybind: z.string(),
});

const TranslateJsonMessage = z.object({
    type: z.optional(z.literal("translatable")),
    translate: z.string(),
    with: z.optional(z.array(JsonMessage)),
    fallback: z.optional(JsonMessage),
});

const ScoreboardJsonMessage = z.object({
    type: z.optional(z.literal("score")),
    score: z.object({
        name: z.string(),
        objective: z.string(),
    }),
});

const NbtJsonMessage = z.object({
    type: z.optional(z.literal("nbt")),
    nbt: z.string(),
    interpret: z.optional(z.boolean()),
    separator: z.optional(JsonMessage),
});

const BlockNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("block")),
    block: z.string(),
});

const EntityNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("entity")),
    entity: z.string(),
});

const StorageNbtJsonMessage = NbtJsonMessage.extend({
    source: z.optional(z.literal("storage")),
    storage: z.string(),
});

interface BaseJsonMessage {}

interface TextJsonMessage extends BaseJsonMessage {
    type?: "text";
    text: string;
}

interface SelectorJsonMessage extends BaseJsonMessage {
    type?: "selector";
    selector: string;
    separator?: JsonMessage;
}

interface KeybindJsonMessage extends BaseJsonMessage {
    type?: "keybind";
    keybind: string;
}

interface TranslateJsonMessage extends BaseJsonMessage {
    type?: "translatable";
    translate: string;
    with?: JsonMessage[];
    fallback?: JsonMessage;
}

interface ScoreboardJsonMessage extends BaseJsonMessage {
    type?: "score";
    score: {
        name: string;
        objective: string;
    };
}

interface NbtJsonMessage extends BaseJsonMessage {
    type?: "nbt";
    nbt: string;
    interpret?: boolean;
    separator?: JsonMessage;
}

interface BlockNbtJsonMessage extends NbtJsonMessage {
    source?: "block";
    block: string;
}

interface EntityNbtJsonMessage extends NbtJsonMessage {
    source?: "entity";
    entity: string;
}

interface StorageNbtJsonMessage extends NbtJsonMessage {
    source?: "storage";
    storage: string;
}

export type JsonMessage =
    | string
    | TextJsonMessage
    | SelectorJsonMessage
    | KeybindJsonMessage
    | TranslateJsonMessage
    | ScoreboardJsonMessage
    | NbtJsonMessage
    | BlockNbtJsonMessage
    | EntityNbtJsonMessage
    | StorageNbtJsonMessage
    | JsonMessage[];

export function interpretMessage(message: JsonMessage): string {
    if (typeof message === "string") {
        return message;
    }

    if ("text" in message) {
        return message.text;
    }

    if ("selector" in message) {
        return message.selector;
    }

    if ("keybind" in message) {
        return `<${message.keybind}>`;
    }

    if ("translate" in message) {
        return interpretTranslation(message);
    }

    if ("score" in message) {
        return `<${message.score.name}->${message.score.objective}>`;
    }

    if ("nbt" in message) {
        return `${message.nbt}`;
    }

    if (Array.isArray(message)) {
        return message.map(interpretMessage).join("");
    }

    // this return is to catch any missing cases but it should never be reached.
    // if there is an unhandled case, the type of message will no longer be `never`
    // so it will be caught by the type system.
    return message;
}

function interpretTranslation(message: TranslateJsonMessage): string {
    const args = message.with?.map(interpretMessage) ?? [];

    const findArg = (n: number) => args[n] ?? `%${n + 1}$s`;

    const getIndex = (match: RegExpExecArray) => {
        if (match[1]) {
            return argIndex++;
        }

        if (match[2]) {
            return parseInt(match[2]) - 1;
        }

        throw new Error("Invalid match");
    };

    const text = message.translate;
    const matcher = /(%s)|%(\d+)\$s/g;
    const buffer = [];
    let cursor = 0;
    let argIndex = 0;

    while (true) {
        const matchArray = matcher.exec(text);

        if (!matchArray) {
            break;
        }

        buffer.push(text.substring(cursor, matchArray.index));
        buffer.push(findArg(getIndex(matchArray)));

        cursor = matchArray.index + matchArray[0].length;
    }

    buffer.push(text.substring(cursor));

    return buffer.join("");
}
