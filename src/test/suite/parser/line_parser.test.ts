import * as assert from 'assert';
import LineParser from '../../../parser/line_parser';
import { TokenKind, Token } from '../../../parser/token';

suite('LinePaser Test Suite', () => {
	test('Say Parse', () => {
		assert.deepEqual(new LineParser(`say hello world`).parse(), [
			{ kind: TokenKind.Command, value: 'say' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'hello' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'world' },
		] as Token[]);
	});

	test('Simple Give Parse', () => {
		assert.deepEqual(new LineParser(`give @s minecraft:diamond 64`).parse(), [
			{ kind: TokenKind.Command, value: 'give' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Selector, value: '@s' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'minecraft:diamond' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Number, value: '64' },
		] as Token[]);
	});

	test('NBT Parse', () => {
		assert.deepEqual(new LineParser(`execute if entity @s[nbt={foo: 1b, bar: { baz: "YEET" }}] run function #minecraft:tick`).parse(), [
			{ kind: TokenKind.Command, value: 'execute' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'if' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'entity' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Selector, value: '@s[nbt={foo: 1b, bar: { baz: "YEET" }}]' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'run' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'function' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: '#minecraft:tick' },
		] as Token[]);

		assert.deepEqual(new LineParser(`tellraw @s [{"text": "Test #1"}]`).parse(), [
			{ kind: TokenKind.Command, value: 'tellraw' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Selector, value: '@s' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Nbt, value: '[{"text": "Test #1"}]' }
		]);

		assert.deepEqual(new LineParser(`tellraw @s [{"text": "Test #2"]`).parse(), [
			{ kind: TokenKind.Command, value: 'tellraw' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Selector, value: '@s' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Nbt, value: '[{"text": "Test #2"]' }
		]);
	});

	test('Function Parse', () => {
		assert.deepEqual(new LineParser(`function path:to/test/function`).parse(), [
			{ kind: TokenKind.Command, value: 'function' },
			{ kind: TokenKind.Whitespace, value: ' ' },
			{ kind: TokenKind.Command, value: 'path:to/test/function' }
		] as Token[]);
	});
});