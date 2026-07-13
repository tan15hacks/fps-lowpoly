import './styles/global.css';
import { Game } from './core/Game';
const host = document.querySelector('#app');
if (!host)
    throw new Error('Application root was not found.');
const game = new Game(host);
void game.initialize().catch((error) => {
    console.error(error);
    host.innerHTML = `<main class="fatal-error"><h1>Polygon Outpost could not start</h1><p>${error instanceof Error ? error.message : 'Unknown initialization error.'}</p><button onclick="location.reload()">Reload</button></main>`;
});
void import('@capacitor/app').then(({ App }) => {
    void App.addListener('backButton', () => {
        if (!game.handleBackButton()) {
            const confirmed = window.confirm('Exit Polygon Outpost?');
            if (confirmed)
                void App.exitApp();
        }
    });
    void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive)
            game.pauseForBackground();
    });
}).catch(() => undefined);
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        const toast = document.createElement('button');
        toast.className = 'update-toast';
        toast.textContent = 'Update ready — reload';
        toast.addEventListener('click', () => location.reload());
        document.body.appendChild(toast);
    });
}
