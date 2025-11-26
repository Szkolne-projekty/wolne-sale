import { timetableManager } from '$lib/server';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { FindEmptyRoomsError } from '$lib/constants';

export const load: PageServerLoad = async () => {
	const hoursNumbers = timetableManager.getLessonNumbers();

	return {
		hoursNumbers
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		if (!data.get('day') || !data.get('lesson-number')) {
			return fail(400, {
				error: FindEmptyRoomsError.NO_REQUIRED_DATA
			});
		}

		const day = Number(data.get('day'));
		const lessonIndex = Number(data.get('lesson-number'));

		const result = timetableManager.findEmptyRoomsValidated(day, lessonIndex);

		if (result.error) {
			return fail(400, {
				error: result.error
			});
		}

		return {
			success: true,
			rooms: result.rooms,
			lessonIndex,
			day
		};
	}
};
