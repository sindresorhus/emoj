import React, {useState, useCallback, useEffect} from 'react';
import {
	Box,
	Text,
	useApp,
	useInput,
} from 'ink';
import TextInput from 'ink-text-input';
import skinTone, {type SkinToneType} from 'skin-tone';
import mem from 'mem';
import emoj from './index.js';

// From https://usehooks.com/useDebounce/
const useDebouncedValue = <T,>(value: T, delay: number): T => { // eslint-disable-line @typescript-eslint/comma-dangle
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
};

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(async (string: string, upperBound: number) => {
	const array = await emoj(string);
	return array.slice(0, upperBound);
});

const stageChecking = 0;
const stageSearch = 1;
const stageCopied = 2;

type QueryInputProperties = {
	readonly query: string;
	readonly placeholder: string;
	readonly onChange: (value: string) => void;
};

function QueryInput({query, placeholder, onChange}: QueryInputProperties) {
	return (
		<Box>
			<Text bold color='cyan'>
				›{' '}
			</Text>

			<TextInput showCursor={false} value={query} placeholder={placeholder} onChange={onChange}/>
		</Box>
	);
}

type CopiedMessageProperties = {
	readonly emoji: string | undefined;
};

function CopiedMessage({emoji}: CopiedMessageProperties) {
	return (
		<Text color='green'>
			{`${emoji} has been copied to the clipboard`}
		</Text>
	);
}

const skinToneNames: SkinToneType[] = [
	'none',
	'white',
	'creamWhite',
	'lightBrown',
	'brown',
	'darkBrown',
];

type SearchProperties = {
	readonly query: string;
	readonly emojis: string[];
	readonly skinNumber: number;
	readonly selectedIndex: number;
	readonly onChangeQuery: (value: string) => void;
};

function Search({query, emojis, skinNumber, selectedIndex, onChangeQuery}: SearchProperties) {
	const list = emojis.map((emoji: string, index: number) => (
		<Box key={emoji}>
			<Text backgroundColor={index === selectedIndex ? 'gray' : undefined}>
				{' '}
				{skinTone(emoji, skinToneNames[skinNumber]!)}
				{' '}
			</Text>
		</Box>
	));

	return (
		<Box flexDirection='column' paddingTop={1} paddingBottom={emojis.length === 0 ? 2 : 0}>
			<QueryInput
				query={query}
				placeholder='Relevant emojis will appear when you start writing'
				onChange={onChangeQuery}
			/>
			<Box paddingTop={1}>
				{list}
			</Box>
		</Box>
	);
}

type EmojProperties = {
	readonly skinNumber: number;
	readonly limit: number;
	readonly onSelectEmoji: (emoji: string) => void;
};

function Emoj({skinNumber: initialSkinNumber, limit, onSelectEmoji}: EmojProperties) {
	const {exit} = useApp();
	const [stage, setStage] = useState(stageChecking);
	const [query, setQuery] = useState('');
	const [emojis, setEmojis] = useState<string[]>([]);
	const [skinNumber, setSkinNumber] = useState(initialSkinNumber);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedEmoji, setSelectedEmoji] = useState<string>();

	useEffect(() => {
		if (selectedEmoji && stage === stageCopied) {
			onSelectEmoji(selectedEmoji);
		}
	}, [selectedEmoji, stage, onSelectEmoji]);

	const changeQuery = useCallback((query: string) => {
		setSelectedIndex(0);
		setEmojis([]);
		setQuery(query);
	}, []);

	useEffect(() => {
		setStage(stageSearch);
	}, []);

	const debouncedQuery = useDebouncedValue(query, 200);

	useEffect(() => {
		if (debouncedQuery.length <= 1) {
			return undefined;
		}

		let isCanceled = false;

		const run = async () => {
			const emojis = await fetch(debouncedQuery, limit);

			// Don't update state when this effect was canceled to avoid
			// results that don't match the search query
			if (!isCanceled) {
				setEmojis(emojis);
			}
		};

		run(); // eslint-disable-line @typescript-eslint/no-floating-promises

		return () => {
			isCanceled = true;
		};
	}, [debouncedQuery, limit]);

	const selectEmoji = useCallback((emojiIndex: number) => {
		const emoji = emojis[emojiIndex];
		if (emoji) {
			setSelectedEmoji(skinTone(emoji, skinToneNames[skinNumber]!));
			setStage(stageCopied);
		}
	}, [emojis, skinNumber]);

	const handleSkinToneChange = useCallback((direction: 'up' | 'down') => {
		if (direction === 'up' && skinNumber < 5) {
			setSkinNumber(skinNumber + 1);
		} else if (direction === 'down' && skinNumber > 0) {
			setSkinNumber(skinNumber - 1);
		}
	}, [skinNumber]);

	const handleIndexChange = useCallback((direction: 'left' | 'right') => {
		if (direction === 'right') {
			setSelectedIndex(selectedIndex < emojis.length - 1 ? selectedIndex + 1 : 0);
		} else {
			setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : emojis.length - 1);
		}
	}, [selectedIndex, emojis.length]);

	useInput((input, key) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			exit();
			return;
		}

		if (key.return && emojis.length > 0) {
			selectEmoji(selectedIndex);
			return;
		}

		const numberKey = Number(input);
		if (input && numberKey >= 1 && numberKey <= emojis.length) {
			selectEmoji(numberKey - 1);
			return;
		}

		if (query.length <= 1) {
			return;
		}

		if (key.upArrow) {
			handleSkinToneChange('up');
		} else if (key.downArrow) {
			handleSkinToneChange('down');
		} else if (key.rightArrow) {
			handleIndexChange('right');
		} else if (key.leftArrow) {
			handleIndexChange('left');
		}
	});

	return (
		<>
			{stage === stageCopied && <CopiedMessage emoji={selectedEmoji}/>}
			{stage === stageSearch && (
				<Search
					query={query}
					emojis={emojis}
					skinNumber={skinNumber}
					selectedIndex={selectedIndex}
					onChangeQuery={changeQuery}
				/>
			)}
		</>
	);
}

export default Emoj;
