import { initTabs } from './ui/tabs.js';
import { mountPathfinding } from './ui/pathfindingView.js';
import { mountSorting } from './ui/sortingView.js';

initTabs();
mountPathfinding(document.getElementById('pathfinding'));
mountSorting(document.getElementById('sorting'));
