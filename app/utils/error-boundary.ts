type RouteErrorLike = {
	status?: number;
	statusText?: string;
};

export function getRouteErrorContent(error: RouteErrorLike | null | undefined): {
	message: string;
	details: string;
	status: number;
} {
	if (error?.status === 404) {
		return {
			message: "404",
			details: "The requested page could not be found.",
			status: 404,
		};
	}

	return {
		message: error?.status ? "Error" : "Oops!",
		details: error?.statusText || "An unexpected error occurred.",
		status: error?.status ?? 500,
	};
}
