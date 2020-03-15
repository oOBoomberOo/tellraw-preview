import * as assert from 'assert';
import { LineAnnotation } from '../../annotation';

suite('Annotation Test Suite', () => {
	test('Test Positive: containWhitelistCommand()`', () => {
		const annotation = new LineAnnotation();
		assert.ok(annotation.containWhitelistCommand('execute as @a run tellraw @s {"text": "Hello, World!"}'));
		assert.ok(annotation.containWhitelistCommand('tell Boomber don\'t forget to watch Log Horizon 3!'));
		assert.ok(annotation.containWhitelistCommand('msg Boomber and don\'t forget to watch Dr. Stone 2 as well!'));
		assert.ok(annotation.containWhitelistCommand('w Boomber P.S. Watch Ars Almal while you\'re at it'));
		assert.ok(annotation.containWhitelistCommand('me Watching anime'));
		assert.ok(annotation.containWhitelistCommand('teammsg W A T C H   J O J O'));
		assert.ok(annotation.containWhitelistCommand('tm H O W   A B O U T   N O'));
		assert.ok(annotation.containWhitelistCommand('title @s subtitle "REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"'));
		// Note: It should test positive because 'megumin' contain 'me'
		assert.ok(annotation.containWhitelistCommand('megumin'));
		annotation.dispose();
	});

	test('Test Negative: containWhitelistCommand()`', () => {
		const annotation = new LineAnnotation();
		assert.ok(!annotation.containWhitelistCommand('execute as @a[tag=!global.ignore] at @s run function boomber:example/player/main'));
		assert.ok(!annotation.containWhitelistCommand(`summon zombie ~ ~ ~ {Tags: ['special_zombie', 'global.ignore'], Invulnerable: 1b}`));
		assert.ok(!annotation.containWhitelistCommand('konosuba'));
		assert.ok(!annotation.containWhitelistCommand('seno!'));
		assert.ok(!annotation.containWhitelistCommand('reeeeeeeee'));
		assert.ok(!annotation.containWhitelistCommand('Boomber'));
		assert.ok(!annotation.containWhitelistCommand('💥'));
		annotation.dispose();
	});

	test('Test Positive: allowPreview()', () => {
		const annotation = new LineAnnotation();
		assert.ok(annotation.allowPreview('tellraw'));
		assert.ok(annotation.allowPreview('tell'));
		assert.ok(annotation.allowPreview('msg'));
		assert.ok(annotation.allowPreview('w'));
		assert.ok(annotation.allowPreview('me'));
		assert.ok(annotation.allowPreview('teammsg'));
		assert.ok(annotation.allowPreview('tm'));
		assert.ok(annotation.allowPreview('title'));
		annotation.dispose();
	});
	
	test('Test Negative: allowPreview()', () => {
		const annotation = new LineAnnotation();
		assert.ok(!annotation.allowPreview('function'));
		assert.ok(!annotation.allowPreview('megumin'));
		assert.ok(!annotation.allowPreview('explosion'));
		assert.ok(!annotation.allowPreview('💥'));
		assert.ok(!annotation.allowPreview('ばか'));
		assert.ok(!annotation.allowPreview('reeeeeeeee'));
		assert.ok(!annotation.allowPreview('fukyuuu'));
		assert.ok(!annotation.allowPreview('how_do_i_test'));
		annotation.dispose();
	});

	test('Building simple message', () => {
		const annotation = new LineAnnotation();
		assert.deepEqual(annotation.buildMessage({"text": "Hello, World! #1"}), `Hello, World! #1`);
		assert.deepEqual(annotation.buildMessage({
			"text": "Hello, World! #2",
			"color": "aqua",
			"italic": false
		} as any), `Hello, World! #2`);
		annotation.dispose();
	});

	test('Building complex message', () => {
		const annotation = new LineAnnotation();
		assert.deepEqual(annotation.buildMessage([
			{"text": "This", "color": "blue"} as any,
			" ",
			{"text": "message", "color": "green"},
			{"text": " ", "extras": [
				{"text": "is ", "color": "red", "italic": true},
				{"text": "very ", "color": "blue", "bold": true},
				{"translate": "complex", "color": "green"}
			]}
		]), `This message is very complex`);
		annotation.dispose();
	});
});