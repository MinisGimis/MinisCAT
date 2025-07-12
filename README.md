# MinisCAT

MinisCAT is a web-based Computer Assisted Translation (CAT) tool that seeks to bring traditional desktop CAT tools to the web, providing a seamless experience whether you are translating a passage on your computer, or on the go with your phone.

**Web-Based Interface**: Accessible from any device - your phone, tablet, or computer. No downloads or installations required

**Chapter TOC**: Automatically separate into chapters using customizable regex patterns

**Pinyin Display**: Show pronunciation above original Chinese characters

**Character Conversion**: Toggle between simplified and traditional Chinese characters

**AI Translation**: Automatically translate text using OpenAI models and view it underneath the original text

**Direct Editing**: Edit translated text directly inline

**Infinite Scroll**: Navigate chapters with infinite vertical scrolling

**Viewer Customization**: Adjust padding and font size to your preferences

**Glossary Management**: Retain translations for key terms, character names, and their gender pronouns

## Live Demo

**View live application**: [https://brave-sea-05d45170f.5.azurestaticapps.net/](https://brave-sea-05d45170f.5.azurestaticapps.net/)

## Setup Instructions

### Prerequisites

- Node.js (version 16 or higher)
- npm
- OpenAI API key

### Installation

1. **Clone the repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

4. **Open http://localhost:3000 on your browser**

### First Steps

1. **Upload a Chinese .txt Document**:

   - Click "UPLOAD NOVEL" on the welcome screen
   - Select a `.txt` file
   - Pick a suggested regex, or use your own custom regex, to split the document into correct chapters.

2. **Set up your API key**:

   - Click the settings icon in the top-right corner
   - Scroll down to API Configuration
   - Enter your OpenAI API key in the "API Key" field
   - Click "SAVE API KEY"

3. **Start translating**:
   - Select a chapter from the chapter list
   - Click "Translate" to begin AI-powered translation
   - View translations inline or below the original text and tap on them to edit

## Settings

### Display Settings

- **Font Size**: Adjust text size
- **Viewer Padding**: Control left/right margins
- **Show Chapters**: Toggle chapter list visibility
- **Show Footer**: Toggle footer visibility

### Translation Settings

- **Auto Translate Next**: Automatically start translating the current and next chapter (if untranslated)

- **Translation Model**: Choose from different OpenAI models

  - `gpt-4.1-nano` (~1¢ per 10k Chinese characters) - Recommended
  - `gpt-4.1-mini` (~4x cost)
  - `gpt-4.1` (~20x cost)
  - `gpt-4o-mini` (~1.5x cost)
  - `gpt-4o` (~25x cost)

- **Max Lines Per Chunk**: Control how many lines are sent per translation request.

- **Show Translation Inline**: Display translations below original text

- **Allow Edits**: Enable inline editing of translations

### Text Display Settings

- **Show Pinyin**: Display pronunciation above Chinese characters

- **Block Text Pinyin**: Group pinyin by sentence instead of individual characters. This is useful when copying the original text, or using a dictionary browser extension.

- **Character Type**: Choose between:
  - **Original**: Text as uploaded
  - **Simplified**: Convert to simplified Chinese
  - **Traditional**: Convert to traditional Chinese

### API Configuration

- **API Key**: Sets the API key used when translating

### File Management

- **Choose .txt File**: Imports .txt file, this will clear your existing data.

- **Export all to txt**: Exports all chapters (original and translated) as a single .txt file.

### Glossary Features

- **Automatic Term Detection**: AI identifies key terms and characters to add
- **Manual Management**: Add, edit, and delete glossary entries

## Translation Process

1. **Chunking**: Text is split into manageable chunks (# of lines) based on your settings
2. **AI Translation**: Each chunk is sent to OpenAI's API for translation
3. **Error Handling**: Failed chunks are automatically retried with smaller sizes
4. **Real time updates**: Translations returned from the API are updated in real time
5. **Glossary Integration**: New terms are automatically added to your glossary

### Recommendations

- Use `gpt-4.1-nano` with chunk sizes around 4-10.
- Enable "Auto Translate Next" with "View Translations Inline" disabled if you are just reading and not translating
