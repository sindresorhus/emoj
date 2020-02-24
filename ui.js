'use strict';
const React = require('react');
const {Box, Color, Text, AppContext, StdinContext} = require('ink');
const TextInput = require('ink-text-input').default;
const debounce = require('lodash.debounce');
const skinTone = require('skin-tone');
const autoBindReact = require('auto-bind/react');
const mem = require('mem');
const emoj = require('.');

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(async string => {
	const array = await emoj(string);
	return array.slice(0, 7);
});

const debouncer = debounce(cb => cb(), 200);

const STAGE_CHECKING = 0;
const STAGE_SEARCH = 1;
const STAGE_COPIED = 2;

// TODO: Move these to https://github.com/sindresorhus/ansi-escapes
const ARROW_UP = '\u001B[A';
const ARROW_DOWN = '\u001B[B';
const ARROW_LEFT = '\u001B[D';
const ARROW_RIGHT = '\u001B[C';
const ESC = '\u001B';
const CTRL_C = '\u0003';
const RETURN = '\r';

const QueryInput = ({query, placeholder, onChange}) => (
	<Box>
		<Text bold>
			<Color cyan>
				›
			</Color>

			{' '}

			<TextInput showCursor={false} value={query} placeholder={placeholder} onChange={onChange}/>
		</Text>
	</Box>
);

const Emoji = ({emoji, skinNumber}) => (
	<Box marginRight={2}>
		{skinTone(emoji, skinNumber)}
	</Box>
);

const CopiedMessage = ({emoji}) => (
	<Color green>
		{`${emoji}  has been copied to the clipboard`}
	</Color>
);

const Search = ({query, emojis, skinNumber, selectedIndex, onChangeQuery}) => {
	const list = emojis.map((emoji, index) => (
		<Color
			key={emoji}
			bgCyan={index === selectedIndex}
		>
			<Emoji
				emoji={emoji}
				skinNumber={skinNumber}
			/>
		</Color>
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

class Emoj extends React.PureComponent {
	constructor(props) {
		super(props);
		autoBindReact(this);

		this.state = {
			stage: STAGE_CHECKING,
			query: '',
			emojis: [],
			skinNumber: props.skinNumber,
			selectedIndex: 0,
			selectedEmoji: null
		};
	}

	render() {
		const {
			stage,
			query,
			emojis,
			skinNumber,
			selectedIndex,
			selectedEmoji
		} = this.state;

		return (
			<Box>
				{stage === STAGE_COPIED && <CopiedMessage emoji={selectedEmoji}/>}
				{stage === STAGE_SEARCH && (
					<Search
						query={query}
						emojis={emojis}
						skinNumber={skinNumber}
						selectedIndex={selectedIndex}
						onChangeQuery={this.handleChangeQuery}
					/>
				)}
			</Box>
		);
	}

	componentDidMount() {
		this.setState({stage: STAGE_SEARCH}, () => {
			this.props.stdin.on('data', this.handleInput);
		});
	}

	handleChangeQuery(query) {
		this.setState({
			query,
			emojis: [],
			selectedIndex: 0
		});

		this.fetchEmojis(query);
	}

	handleInput(input) {
		const {onExit, onSelectEmoji} = this.props;
		let {skinNumber, selectedIndex, emojis, query} = this.state;

		if (input === ESC || input === CTRL_C) {
			onExit();
			return;
		}

		if (input === RETURN) {
			if (emojis.length > 0) {
				this.setState({
					selectedEmoji: skinTone(emojis[selectedIndex], skinNumber),
					stage: STAGE_COPIED
				}, () => {
					onSelectEmoji(this.state.selectedEmoji);
				});
			}

			return;
		}

		// Select emoji by typing a number
		// Catch all 10 keys, but handle only the same amount of keys
		// as there are currently emojis
		const numKey = Number(input);
		if (numKey >= 0 && numKey <= 9) {
			if (numKey >= 1 && numKey <= emojis.length) {
				this.setState({
					selectedEmoji: skinTone(emojis[numKey - 1], skinNumber),
					stage: STAGE_COPIED
				}, () => {
					onSelectEmoji(this.state.selectedEmoji);
				});
			}

			return;
		}

		// Filter out all ansi sequences except the up/down keys which change the skin tone
		// and left/right keys which select emoji inside a list
		const isArrowKey = [ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT].includes(input);

		if (!isArrowKey || query.length <= 1) {
			return;
		}

		if (input === ARROW_UP) {
			if (skinNumber < 5) {
				skinNumber++;
			}
		}

		if (input === ARROW_DOWN) {
			if (skinNumber > 0) {
				skinNumber--;
			}
		}

		if (input === ARROW_RIGHT) {
			if (selectedIndex < emojis.length - 1) {
				selectedIndex++;
			} else {
				selectedIndex = 0;
			}
		}

		if (input === ARROW_LEFT) {
			if (selectedIndex > 0) {
				selectedIndex--;
			} else {
				selectedIndex = emojis.length - 1;
			}
		}

		this.setState({skinNumber, selectedIndex});
	}

	fetchEmojis(query) {
		if (query.length <= 1) {
			return;
		}

		debouncer(async () => {
			const emojis = await fetch(query);

			if (this.state.query.length > 1) {
				this.setState({emojis});
			}
		});
	}
}

module.exports = props => (
	<AppContext.Consumer>
		{({exit}) => (
			<StdinContext.Consumer>
				{({stdin, setRawMode}) => (
					<Emoj stdin={stdin} setRawMode={setRawMode} onExit={exit} {...props}/>
				)}
			</StdinContext.Consumer>
		)}
	</AppContext.Consumer>
);
