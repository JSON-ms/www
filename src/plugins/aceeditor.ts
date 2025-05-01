import ace from 'ace-builds';

import modeYamlUrl from 'ace-builds/src-noconflict/mode-yaml?url';
ace.config.setModuleUrl('ace/mode/yaml', modeYamlUrl);

import themeGithubUrl from 'ace-builds/src-noconflict/theme-github_dark?url';
ace.config.setModuleUrl('ace/theme/github_dark', themeGithubUrl);

import workerYamlUrl from 'ace-builds/src-noconflict/worker-yaml?url';
ace.config.setModuleUrl('ace/mode/yaml_worker', workerYamlUrl);

// import modePhpUrl from 'ace-builds/src-noconflict/mode-php?url';
// ace.config.setModuleUrl('ace/mode/php', modePhpUrl);
//
// import modeShUrl from 'ace-builds/src-noconflict/mode-sh?url';
// ace.config.setModuleUrl('ace/mode/sh', modeShUrl);

import modeJsonUrl from 'ace-builds/src-noconflict/mode-json?url';
ace.config.setModuleUrl('ace/mode/json', modeJsonUrl);

import modeTypescriptUrl from 'ace-builds/src-noconflict/mode-typescript?url';
ace.config.setModuleUrl('ace/mode/typescript', modeTypescriptUrl);

// import modePythonUrl from 'ace-builds/src-noconflict/mode-python?url';
// ace.config.setModuleUrl('ace/mode/python', modePythonUrl);
//
// import modeJavascriptUrl from 'ace-builds/src-noconflict/mode-javascript?url';
// ace.config.setModuleUrl('ace/mode/javascript', modeJavascriptUrl);
//
// import snippetsYamlUrl from 'ace-builds/src-noconflict/snippets/yaml?url';
// ace.config.setModuleUrl('ace/snippets/yaml', snippetsYamlUrl);

import 'ace-builds/src-noconflict/ext-language_tools';

ace.require("ace/ext/language_tools");
ace.config.set("basePath", "/node_modules/ace-builds/src-min-noconflict");

