# Fabula Ultima importer

This [Foundry Virtual Tabletop](https://foundryvtt.com/) module is designed to work with [Unofficial Fabula Ultima System](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima).  It add buttons for importing data from:
1. an english pdf, watermarked by DriveThruRPG, of [Fabula Ultima](https://www.needgames.it/fabula-ultima-en/) by [Need Games](https://www.needgames.it/)
2. [Fultimator!](https://fabula-ultima-helper.web.app/)

## Installation

1. Open the Foundry Setup screen and navigate to the "Add-on Modules" tab.
2. Click the "Install Module" button on the bottom left.
3. Paste`https://github.com/xeqi/fu-parser/releases/latest/download/module.json` into the "Manifest URL:" field on the bottom.
4. Click "Install".
5. Launch a game world and go to Game Settings > Manage Modules and enable the module.

## PDF Import

It will currently import and create Items and Actors for:
* Armor, Accessories, Shields, Weapons
* Consumable Items
* Beastiary

### Instructions

1. Install the module and confirm it shows up in "Add-on Modules" on the setup page.
2. Launch a game world and go to Game Settings > Manage Modules and enable the module.
3. Once enabled go to the Game Settings menu and there will be a "FU Importer" heading with an "Import PDF" button.
4. Provide the pdf and determine the directory you would like to save extracted images.
5. Review the parse information provided.
6. Click on "Import Data"

### Debugging

This project is still in its early days.  Chances are your pdf will not work. Bad parses should provide a list of failed parses in the preview output. That information could be useful to compare against the parsers and determine what fix needs to occur.

## Fulminator Import

Fulminator provides a json export file for npcs.  This file can be used to import data into your world.

Currently the following are unsupported:
1. Phases
2. Multipart
3. Notes

### Instructions 
1. Go to the Game Settings menu and there will be a "FU Importer" heading with an "Import Fulminator" button.
2. Paste the contents of the json export file from Fultimator
3. Review any error information provided.
4. Click on "Import Data"


## Contributing

### The Future
Future additions will include:
* Better parsing of Beastiary skills/spells descriptions to pull out damage information
* Import Classes + Skills/Spells from PDF

### Code Overview

This module mainly consists of two Foundry `Application`s that convert data from an import string to a Foundry `Item` or `Actor` based on the template definitions of [Unofficial Fabula Ultima System](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima).

For PDF parsing this module uses [PDF.js](https://mozilla.github.io/pdf.js/) to read the pdf and act like a lexer to create a `Token[]`.  This `Token[]` is read by parsers built using applicative parser combinators.  The resulting datastructure is used to import the information.

### Local Installation

1. Clone the repo to a local machine.
2. Run `npm install` to install the local dependencies
3. Run `npm run build` to create a `dist` folder containing packed js files
4. Install the contents of `dist` into a `modules/fu-parser` directory in your Foundry instance.  For example for a local linux distribution run `ln -sr dist/ ~/.local/share/FoundryVTT/Data/modules/fu-parser`

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