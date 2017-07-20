'use strict';
const dns = require('dns');
const {h, Component, Indent, Text} = require('ink');
const TextInput = require('ink-text-input');
const debounce = require('lodash.debounce');
const skinTone = require('skin-tone');
const autoBind = require('auto-bind');
const hasAnsi = require('has-ansi');
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

const OfflineMessage = () => (
	<div>
		<Text bold red>
			›
		</Text>

		<Text dim>
			{' Please check your internet connection'}
		</Text>

		<br/>
	</div>
);

const QueryInput = ({query, placeholder, onChange}) => (
	<div>
		<Text bold>
			<Text cyan>
				›
			</Text>

			{' '}

			<TextInput value={query} placeholder={placeholder} onChange={onChange}/>
		</Text>
	</div>
);

const Emoji = ({emoji, skinNumber}) => (
	<span>
		{skinTone(emoji, skinNumber)}
		{'  '}
	</span>
);

const SelectedIndicator = ({selectedIndex}) => (
	<Indent size={selectedIndex} indent="   ">
		<Text cyan>
			↑
		</Text>
	</Indent>
);

const CopiedMessage = ({emoji}) => (
	<Text green>
		{`${emoji}  has been copied to the clipboard`}
	</Text>
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
		<span>
			<QueryInput
				query={query}
				placeholder="Relevant emojis will appear when you start writing"
				onChange={onChangeQuery}
			/>

			<br/>
			{list}
			<br/>

			{emojis.length > 0 && <SelectedIndicator selectedIndex={selectedIndex}/>}
		</span>
	);
};

class Emoj extends Component {
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
			<span>
				<br/>

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
			</span>
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

				process.stdin.on('keypress', this.handleKeyPress);
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

	handleKeyPress(ch, key = {}) {
		const {onExit, onSelectEmoji} = this.props;
		let {skinNumber, selectedIndex, emojis, query} = this.state;

		// Filter out all ansi sequences except the up/down keys which change the skin tone
		// and left/right keys which select emoji inside a list
		const isArrowKey = ['up', 'down', 'left', 'right'].includes(key.name);

		if (hasAnsi(key.sequence) && (!isArrowKey || query.length <= 1)) {
			return;
		}

		if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
			onExit();
			return;
		}

		// Select emoji by typing a number
		// Catch all 10 keys, but handle only the same amount of keys
		// as there are currently emojis
		const numKey = Number(key.name);
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

		if (key.name === 'return') {
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

		if (key.name === 'up') {
			if (skinNumber < 5) {
				skinNumber++;
			}
		}

		if (key.name === 'down') {
			if (skinNumber > 0) {
				skinNumber--;
			}
		}

		if (key.name === 'right') {
			if (selectedIndex < emojis.length - 1) {
				selectedIndex++;
			} else {
				selectedIndex = 0;
			}
		}

		if (key.name === 'left') {
			if (selectedIndex > 0) {
				selectedIndex--;
			} else {
				selectedIndex = emojis.length - 1;
			}
		}

		if (key.sequence !== ch) {
			this.setState({skinNumber, selectedIndex});
		}
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

module.exports = Emoj;
