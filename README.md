# Fabula Ultima pdf importer

This [Foundry Virtual Tabletop](https://foundryvtt.com/) module is designed to work with [Unofficial Fabula Ultima System](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima), and will import data from an english pdf, watermarked by DriveThruRPG, of [Fabula Ultima](https://www.needgames.it/fabula-ultima-en/) by [Need Games](https://www.needgames.it/).

It will currently import and create Items and Actors for:
* Armor, Accessories, Shields, Weapons
* Consumable Items
* Beastiary

## Installation

1. Clone the repo to a local machine.
2. Run `npm install` to install the local dependencies
3. Run `npm run build` to create a `dist` folder containing packed js files
4. Install the contents of `dist` into a `modules/fu-parser` directory in your Foundry instance.  For example for a local linux distribution run `ln -s ~/fu-parser/dist  ~/.local/share/FoundryVTT/Data/modules/fu-parser`

## How to import data

1. Install the module and confirm it shows up in "Add-on Modules" on the setup page.
2. Launch a game world and go to Game Settings > Manage Modules and enable the module.
3. Once enabled go to Game Settings and there will be a "FU Importer" heading with an "Import PDF" button. Click it.
4. Provide the pdf and determine the directoy you would like to save extracted images.
5. Click on "Import Data"

## Debugging

This project is still in its early days.  Chances are your pdf will not work.  If you open the developer console and filter lines by "parses", you can see a list of failed pages and the corresponding failed parses. That output might be useful for adapting the parsers to your specific pdf.

## The Future
Future additions will include:
* Error reporting for bad parses
* Better parsing of Beastiary skills/spells descriptions to pull out damage information
* Import Classes + Skills/Spells
* Create hosted builds for "Foundry Setup" based installation
* More robust parsing

## Contributing

### Code Overview

This module uses [PDF.js](https://mozilla.github.io/pdf.js/) to read the pdf and act like a lexer to create a `Token[]`.  This `Token[]` is read by parsers built using applicative parser combinators. The resulting parses provide a datastructure that gets transformed into a Foundry `Item` or `Actor` based on the template definitions of [Unofficial Fabula Ultima System](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima), or an `ImageBitmap` that can be sent to the Foundry server to be saved/hosted.

### Testing

1. Place a copy of your Fabula Ultima pdf at `data/Fabula_Ultima_-_Core_Rulebook.pdf`.
2. `npm install` if not previously ran for an installation.
3. `npm run test`

The tests are a combination of property based generated tests for individual parsers, and functional tests against the pdf to confirm each pages parses into a single result.
All Foundry VTT based functionality is untested.

### VS Code + Jest extension

This module builds using ESNext modules so the Jest extension needs to be told to enable the correct options in node.  To do so add to `.vscode/settings.json`:
```
"jest.nodeEnv": {
    "NODE_OPTIONS": "--experimental-vm-modules"
}
```