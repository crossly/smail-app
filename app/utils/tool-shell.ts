export type ToolShellConfig = {
	primaryNavItems: string[];
	showFooterDescription: boolean;
	showFooterLinks: boolean;
};

export type HomeToolSections = {
	showHero: boolean;
	showGuides: boolean;
	showNarrative: boolean;
	panelOrder: ["address", "prefix", "inbox"];
	desktopColumns: {
		address: 3;
		prefix: 3;
		inbox: 6;
	};
};

const TOOL_SHELL_CONFIG: ToolShellConfig = {
	primaryNavItems: [],
	showFooterDescription: false,
	showFooterLinks: false,
};

const HOME_TOOL_SECTIONS: HomeToolSections = {
	showHero: false,
	showGuides: false,
	showNarrative: false,
	panelOrder: ["address", "prefix", "inbox"],
	desktopColumns: {
		address: 3,
		prefix: 3,
		inbox: 6,
	},
};

export function getToolShellConfig(): ToolShellConfig {
	return TOOL_SHELL_CONFIG;
}

export function getHomeToolSections(): HomeToolSections {
	return HOME_TOOL_SECTIONS;
}
