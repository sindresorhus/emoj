'use strict';
const React = require('react');
const {useState, useCallback, useEffect} = require('react');
const {Box, Text, useApp, useInput} = require('ink');
const TextInput = require('ink-text-input').default;
const skinTone = require('skin-tone');
const mem = require('mem');
const emoj = require('.');

// From https://usehooks.com/useDebounce/
const useDebouncedValue = (value, delay) => {
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
const fetch = mem(async string => {
	const array = await emoj(string);
	return array.slice(0, 7);
});

const STAGE_CHECKING = 0;
const STAGE_SEARCH = 1;
const STAGE_COPIED = 2;

const QueryInput = ({query, placeholder, onChange}) => (
	<Box>
		<Text bold color="cyan">
			›{' '}
		</Text>

		<TextInput showCursor={false} value={query} placeholder={placeholder} onChange={onChange}/>
	</Box>
);

const CopiedMessage = ({emoji}) => (
	<Text color="green">
		{`${emoji} has been copied to the clipboard`}
	</Text>
);

const Search = ({query, emojis, skinNumber, selectedIndex, onChangeQuery}) => {
	const list = emojis.map((emoji, index) => (
		<Text
			key={emoji}
			backgroundColor={index === selectedIndex && 'gray'}
		>
			{' '}
			{skinTone(emoji, skinNumber)}
			{' '}
		</Text>
	));

	return (
		<Box flexDirection="column" paddingTop={1} paddingBottom={emojis.length === 0 ? 2 : 0}>
			<QueryInput
				query={query}
				placeholder="Relevant emojis will appear when you start writing"
				onChange={onChangeQuery}
			/>
			<Box paddingTop={1}>
				{list}
			</Box>
		</Box>
	);
};

const Emoj = ({skinNumber: initialSkinNumber, onSelectEmoji}) => {
	const {exit} = useApp();
	const [stage, setStage] = useState(STAGE_CHECKING);
	const [query, setQuery] = useState('');
	const [emojis, setEmojis] = useState([]);
	const [skinNumber, setSkinNumber] = useState(initialSkinNumber);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedEmoji, setSelectedEmoji] = useState();

	useEffect(() => {
		if (selectedEmoji && stage === STAGE_COPIED) {
			onSelectEmoji(selectedEmoji);
		}
	}, [selectedEmoji, stage, onSelectEmoji]);

	const changeQuery = useCallback(query => {
		setSelectedIndex(0);
		setEmojis([]);
		setQuery(query);
	});

	useEffect(() => {
		setStage(STAGE_SEARCH);
	}, []);

	const debouncedQuery = useDebouncedValue(query, 200);

	useEffect(() => {
		if (debouncedQuery.length <= 1) {
			return;
		}

		let isCanceled = false;

		const run = async () => {
			const emojis = await fetch(debouncedQuery);

			// Don't update state when this effect was canceled to avoid
			// results that don't match the search query
			if (!isCanceled) {
				setEmojis(emojis);
			}
		};

		run();

		return () => {
			isCanceled = true;
		};
	}, [debouncedQuery]);

	useInput((input, key) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			exit();
			return;
		}

		if (key.return) {
			if (emojis.length > 0) {
				setSelectedEmoji(skinTone(emojis[selectedIndex], skinNumber));
				setStage(STAGE_COPIED);
			}

			return;
		}

		// Select emoji by typing a number
		// Catch all 10 keys, but handle only the same amount of keys
		// as there are currently emojis
		const numberKey = Number(input);
		if (numberKey >= 0 && numberKey <= 9) {
			if (numberKey >= 1 && numberKey <= emojis.length) {
				setSelectedEmoji(skinTone(emojis[numberKey - 1], skinNumber));
				setStage(STAGE_COPIED);
			}

			return;
		}

		// Filter out all ansi sequences except the up/down keys which change the skin tone
		// and left/right keys which select emoji inside a list
		const isArrowKey = key.upArrow || key.downArrow || key.leftArrow || key.rightArrow;

		if (!isArrowKey || query.length <= 1) {
			return;
		}

		if (key.upArrow && skinNumber < 5) {
			setSkinNumber(skinNumber + 1);
		}

		if (key.downArrow && skinNumber > 0) {
			setSkinNumber(skinNumber - 1);
		}

		if (key.rightArrow) {
			if (selectedIndex < emojis.length - 1) {
				setSelectedIndex(selectedIndex + 1);
			} else {
				setSelectedIndex(0);
			}
		}

		if (key.leftArrow) {
			if (selectedIndex > 0) {
				setSelectedIndex(selectedIndex - 1);
			} else {
				setSelectedIndex(emojis.length - 1);
			}
		}
	});

	return (
		<>
			{stage === STAGE_COPIED && <CopiedMessage emoji={selectedEmoji}/>}
			{stage === STAGE_SEARCH && (
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
};

module.exports = Emoj;
