import { describe, it } from "mocha";
import { Command, CommandParser, Node, parseFunction } from "./CommandParser";
import assert from "assert";
import dedent from "dedent";

describe("CommandParser", function () {
    it(`should lex input`, () => {
        const parser = new CommandParser(`say hello`);

        const a = parser.token();
        parser.space();

        const b = parser.token();
        parser.space();

        assert.deepStrictEqual(a, {
            type: "literal",
            index: 0,
            content: "say",
        });
        assert.deepStrictEqual(b, {
            type: "literal",
            index: 4,
            content: "hello",
        });
        assert.equal(parser.isEnd, true);
    });

    it(`should parse json object`, () => {
        const parser = new CommandParser(`{foo:"bar"}`);

        const a = parser.token();
        const b: Node = {
            type: "object",
            content: `{foo:"bar"}`,
            index: 0,
            elements: [{ type: "string", index: 5, content: `"bar"` }],
        };

        assert.deepEqual(a, b);
    });

    it(`should parse multiple commands`, () => {
        const result = parseFunction(dedent`
            say hello world
            tellraw @s {"text": "Hello World"}
        `).map((command) => ({ command: command.command }));

        const expect = [
            {
                command: "say hello world",
            },
            {
                command: `tellraw @s {"text": "Hello World"}`,
            },
        ];

        assert.deepEqual(result, expect);
    });

    it(`should parse multiline command`, () => {
        const input = dedent`
            tellraw @s[predicate=bb:test] {$
                "text": "Hello World", $
                "color": "red" $
            }
            
            say hello world
        `.replace(/\$/g, "\\");

        const result = parseFunction(input);

        const expect: Command[] = [
            {
                command: dedent`
                    tellraw @s[predicate=bb:test] {$
                        "text": "Hello World", $
                        "color": "red" $
                    }`.replace(/\$/g, "\\"),
                node: [
                    { type: "literal", content: "tellraw", index: 0 },
                    {
                        type: "selector",
                        content: "@s[predicate=bb:test]",
                        index: 8,
                    },
                    {
                        type: "object",
                        content:
                            '{\\\n    "text": "Hello World", \\\n    "color": "red" \\\n}',
                        elements: [
                            {
                                type: "string",
                                content: `"Hello World"`,
                                index: 45,
                            },
                            { type: "string", content: `"red"`, index: 75 },
                        ],
                        index: 30,
                    },
                ],
            },
            {
                command: "",
                node: [],
            },
            {
                command: "say hello world",
                node: [
                    { type: "literal", content: "say", index: 86 },
                    { type: "literal", content: "hello", index: 90 },
                    { type: "literal", content: "world", index: 96 },
                ],
            },
        ];

        assert.deepEqual(result, expect);
    });
});
