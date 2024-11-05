import { DecorationOptions } from "vscode";
import { ParseResult } from "./CommandParser";

export function showPreview(parseResult: ParseResult): DecorationOptions[] {
    if (parseResult.type === "command") {
        return [];
    }

    if (parseResult.type === "error") {
        return [
            {
                range: parseResult.range,
                renderOptions: {
                    after: {
                        contentText: parseResult.value,
                    },
                },
            },
        ];
    }

    return [
        {
            range: parseResult.range,
            renderOptions: {
                after: {
                    contentText: parseResult.value,
                },
            },
        },
    ];
}

interface Text {
    color: string;
    text: string;
}
