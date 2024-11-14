import { DecorationOptions, Range } from "vscode";
import { Command, Node } from "./parser/CommandParser";
import { JSON_MESSAGE, PatternMatchResult } from "./pattern/CommandPattern";
import { parseJsonMessage, interpretMessage } from "./JsonInterpreter";

function of(opts: DecorationOptions): DecorationOptions[] {
    return [opts];
}

type MatchResultWithRange = PatternMatchResult & { range: Range };

export function showPreview(opt: MatchResultWithRange): DecorationOptions[] {
    const { map, range } = opt;

    const message = map.get(JSON_MESSAGE);

    if (!message) {
        return [];
    }

    const result = interpretMessage(parseJsonMessage(message));

    return of({
        range,
        renderOptions: {
            after: {
                contentText: result,
            },
        },
    });
}
