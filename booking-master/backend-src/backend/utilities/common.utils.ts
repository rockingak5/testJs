export const isTrue = (value: any) => {
	if (typeof value === 'string') {
		return value?.toLocaleLowerCase() === 'true';
	}
	return value === 1 || value === true;
};
