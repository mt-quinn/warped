import { render } from 'preact';
import { App } from './components/App';
import { start } from './game/loop';
import { loadGame } from './game/game';
import './styles/main.css';

loadGame();
start();

render(<App />, document.getElementById('app')); 