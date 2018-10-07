'use strict';
const dns = require('dns');
const React = require('react');
const {Box, Color, Text, StdinContext} = require('ink');
const TextInput = require('ink-text-input').default;
const debounce = require('lodash.debounce');
const skinTone = require('skin-tone');
const autoBind = require('auto-bind');
const mem = require('mem');
const emoj = require('.');

// Limit it to 7 results so not to overwhelm the user
// This also reduces the chance of showing unrelated emojis
const fetch = mem(str => emoj(str).then(arr => arr.slice(0, 7)));

const debouncer = debounce(cb => cb(), 200);

const STAGE_CHECKING = 0;
const STAGE_OFFLINE = 1;
const STAGE_SEARCH = 2;
const STAGE_COPIED = 3;

const ARROW_UP = '\u001b[A';
const ARROW_DOWN = '\u001b[B';
const ARROW_LEFT = '\u001b[D';
const ARROW_RIGHT = '\u001b[C';
const ESC = '\u001b';
const CTRL_C = '\x03';
const RETURN = '\r';

const OfflineMessage = () => (
	<Box>
		<Text bold>
			<Color red>
				›
			</Color>
		</Text>

		<Color dim>
			{' Please check your internet connection'}
		</Color>
	</Box>
);

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

const SelectedIndicator = ({selectedIndex}) => (
	<Box marginLeft={selectedIndex * 4}>
		<Color cyan>
			↑
		</Color>
	</Box>
);

const CopiedMessage = ({emoji}) => (
	<Color green>
		{`${emoji}  has been copied to the clipboard`}
	</Color>
);

const Search = ({query, emojis, skinNumber, selectedIndex, onChangeQuery}) => {
	const list = emojis.map(emoji => (
		<Emoji
			key={emoji}
			emoji={emoji}
			skinNumber={skinNumber}
		/>
	));

	return (
		<Box flexDirection="column" paddingTop={1} paddingBottom={emojis.length === 0 ? 2 : 0}>
			<QueryInput
				query={query}
				placeholder="Relevant emojis will appear when you start writing"
				onChange={onChangeQuery}
			/>

			<Box>
				{list}
			</Box>

			{emojis.length > 0 && <SelectedIndicator selectedIndex={selectedIndex}/>}
		</Box>
	);
};

class Emoj extends React.PureComponent {
	constructor(props) {
		super(props);
		autoBind(this);

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
				{stage === STAGE_OFFLINE && <OfflineMessage/>}
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
		dns.lookup('emoji.getdango.com', err => {
			const stage = err && err.code === 'ENOTFOUND' ? STAGE_OFFLINE : STAGE_SEARCH;

			this.setState({stage}, () => {
				if (stage === STAGE_OFFLINE) {
					this.props.onError();
					return;
				}

				this.props.stdin.on('data', this.handleInput);
			});
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

const EmojWithStdin = props => (
	<StdinContext.Consumer>
		{({stdin, setRawMode}) => (
			<Emoj stdin={stdin} setRawMode={setRawMode} {...props}/>
		)}
	</StdinContext.Consumer>
);

module.exports = EmojWithStdin;
