# Vocalis NL ⇄ FR - Traducteur Vocal Instantané

Application web mobile et tablette de traduction vocale instantanée bidirectionnelle (Néerlandais ⇄ Français), ultra-épurée, fluide et **100% gratuite (aucune inscription, aucun abonnement, aucune clé d'API requise)**.

---

## 🌟 Fonctionnalités Clés

1. **Reconnaissance Vocale Native Haute Précision :**
   - Utilise l'API native **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`).
   - Transcription en continu avec affichage des résultats intermédiaires (*interim results*) pour un retour visuel instantané.
   - Reconnexion automatique en cas de pause ou de silence prolongé.

2. **Moteur de Traduction Multi-Niveaux 100% Gratuit :**
   - **Moteur Primaire :** Passerelle instantanée ultra-rapide Google GTX (sans clé, sans quota payant).
   - **Moteur de Secours (Fallback) :** API publique MyMemory pour garantir une continuité de service absolue.
   - Système de *debounce* intelligent pour traduire en temps réel sans saturer le réseau.

3. **Double Mode Ergonomique :**
   - 🇳🇱 ➜ 🇫🇷 **Écouter du Néerlandais (Vocal)** ➜ Traduire en Français (Écrit & Vocal).
   - 🇫🇷 ➜ 🇳🇱 **Parler en Français (Vocal)** ➜ Traduire en Néerlandais (Écrit & Vocal).
   - Bascule instantanée en un clic ou toucher d'écran.

4. **Synthèse Vocale Intégrée (Text-to-Speech) :**
   - Bouton de prononciation audio sur chaque traduction.
   - Option **Auto-Voix** pour énoncer automatiquement la traduction à voix haute dès qu'une phrase est terminée.

5. **Expérience Mobile & Tablette (Android Pixel 7 & iPad Safari) :**
   - Ergonomie pensée pour le pouce (bouton micro tactile géant en bas d'écran).
   - Mode Sombre / Clair automatique et manuel.
   - Compatible **PWA (Progressive Web App)** : installable sur l'écran d'accueil sans passer par un app store.

---

## 📁 Structure des Fichiers

- [`index.html`](file:///e:/TRANSLATOR/index.html) : Interface utilisateur complète (Tailwind CSS, icônes SVG, mise en page mobile-first).
- [`style.css`](file:///e:/TRANSLATOR/style.css) : Animations CSS (ondes sonores en direct, anneau de pulsation du micro, styles tactiles).
- [`app.js`](file:///e:/TRANSLATOR/app.js) : Logique de reconnaissance vocale, moteur de traduction, synthèse vocale et persistance de l'historique.
- [`manifest.json`](file:///e:/TRANSLATOR/manifest.json) & [`sw.js`](file:///e:/TRANSLATOR/sw.js) : Configuration PWA et cache hors-ligne.

---

## 🚀 Comment Tester et Déployer

### 1. Test en local sur votre ordinateur
Dans le dossier du projet, lancez un serveur web local :
```bash
# Avec npx (Node.js) :
npx serve -l 3000

# Ou avec Python 3 :
python -m http.server 3000
```
Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans Chrome, Edge ou Safari.

> **Note importante sur le Microphone :** Les navigateurs modernes exigent soit un environnement `localhost`, soit une connexion sécurisée **HTTPS** pour autoriser l'accès au microphone.

---

### 2. Déploiement Gratuit en 1 Minute (pour accès immédiat sur Mobile & iPad)

Pour tester l'application directement sur votre **Google Pixel 7 (Android)** et votre **iPad (Safari)** avec accès HTTPS au micro :

#### Option A : Vercel (Ultra rapide)
1. Installez Vercel CLI ou glissez le dossier sur [vercel.com](https://vercel.com) :
   ```bash
   npx vercel
   ```
2. Vous obtenez immédiatement une URL sécurisée en HTTPS (ex: `https://vocalis.vercel.app`).

#### Option B : Cloudflare Pages ou Netlify
1. Glissez-déposez simplement le dossier `TRANSLATOR` sur [Netlify Drop](https://app.netlify.com/drop) ou Cloudflare Pages.
2. Le site est en ligne en 10 secondes avec HTTPS actif.

#### Option C : GitHub Pages
1. Poussez les fichiers sur un dépôt GitHub.
2. Dans **Settings > Pages**, activez GitHub Pages sur la branche principale.

---

### 3. Installation sur Mobile & iPad (PWA)

- **Sur Google Pixel 7 (Chrome) :**
  1. Ouvrez l'URL HTTPS dans Google Chrome.
  2. Appuyez sur les 3 points en haut à droite > **Ajouter à l'écran d'accueil** (ou "Installer l'application").
  3. L'application s'ouvre désormais en plein écran comme une vraie application native.

- **Sur iPad (Safari) :**
  1. Ouvrez l'URL HTTPS dans Safari.
  2. Appuyez sur l'icône de partage (le carré avec une flèche vers le haut).
  3. Choisissez **Sur l'écran d'accueil**.
  4. L'application fonctionne en plein écran sans les barres de navigation Safari.
