import {
	TimetableList,
	Timetable,
	Table,
	type TableLesson,
	type TableHour
} from '@majusss/timetable-parser';
import { FindEmptyRoomsError } from '$lib/constants';
import config from '$config';

export type ITimetable = TableLesson[][][];

export interface TimetableData {
	name: string;
	id: string;
	timetable: ITimetable;
}

type TimetablesDataKeys = 'classes' | 'rooms';

type TimetablesData = Record<TimetablesDataKeys, Map<string, TimetableData>>;

export enum TimetableType {
	CLASS = 'o',
	ROOM = 's'
}

export class TimetablesManager {
	public timetables: TimetablesData = {
		classes: new Map(),
		rooms: new Map()
	};
	public hours: Record<string, TableHour> = {};

	public findEmptyRooms(day: number, lessonIndex: number): TimetableData[] {
		const empty: TimetableData[] = [];

		if (day < 0) return empty;

		for (const [, roomData] of this.timetables.rooms) {
			if (day >= roomData.timetable.length) continue;

			const dayArr = roomData.timetable[day];
			if (!Array.isArray(dayArr)) continue;

			if (lessonIndex < 0) continue;

			const lessons = dayArr[lessonIndex];
			if (lessonIndex >= dayArr.length || (Array.isArray(lessons) && lessons.length === 0)) {
				empty.push(roomData);
			}
		}

		return empty;
	}

	// INFO: Refactored by AI
	public findEmptyRoomsValidated(
		day: number,
		lessonIndex: number
	): {
		error?: FindEmptyRoomsError;
		rooms?: TimetableData[];
	} {
		if (day < 0 || day > 4) {
			return { error: FindEmptyRoomsError.DAY_NOT_EXIST };
		}

		const hoursCount =
			Object.keys(this.hours).length ||
			this.timetables.classes.values().next().value?.timetable?.[0]?.length ||
			0;

		if (hoursCount === 0) {
			return { error: FindEmptyRoomsError.LESSON_NOT_EXIST };
		}

		if (lessonIndex < 0 || lessonIndex >= hoursCount) {
			return { error: FindEmptyRoomsError.LESSON_NOT_EXIST };
		}

		const rooms = this.findEmptyRooms(day, lessonIndex);
		return { rooms };
	}

	public getLessonNumbers(): number[] {
		const hourKeys = Object.keys(this.hours);
		if (hourKeys.length > 0) {
			return hourKeys.map((k) => this.hours[k].number).filter((n): n is number => n !== undefined);
		}

		const anyClass = this.timetables.classes.values().next().value;
		const hoursCount = anyClass?.timetable?.[0]?.length || 0;
		if (hoursCount === 0) return [];

		return Array.from({ length: hoursCount }, (_, i) => i + 1);
	}

	public async getTimetableList() {
		if (!config.timetableWebsite)
			throw new Error(
				'TIMETABLE_WEBSITE is not defined. You need to set it in your environment variables.'
			);

		const timetablePageHtml = await (await fetch(config.timetableWebsite)).text();

		if (!timetablePageHtml) return null;

		const timetable = new Timetable(timetablePageHtml);

		const response = await (
			await fetch(`${config.timetableWebsite}/${timetable.getListPath()}`)
		).text();

		const timetableList = new TimetableList(response);

		return timetableList.getList();
	}

	public async getTimetables() {
		const list = await this.getTimetableList();

		if (!list) return;

		if (this.timetables.classes.size > 0)
			return console.warn('Timetables already loaded, skipping...');

		for (const item of list.classes) {
			this.timetables.classes.set(item.value, {
				name: item.name,
				id: item.value,
				timetable: await this.fetchTimetable(TimetableType.CLASS, item.value)
			});
		}

		for (const item of list.rooms ?? []) {
			this.timetables.rooms.set(item.value, {
				name: item.name,
				id: item.value,
				timetable: await this.fetchTimetable(TimetableType.ROOM, item.value)
			});
		}

		console.log(
			`Loaded ${this.timetables.classes.size} class and ${this.timetables.rooms.size} room timetables.`
		);
	}

	public async fetchTimetable(timetableType: TimetableType, timetableId: string) {
		const timetableURL = `${config.timetableWebsite}/plany/${timetableType}${timetableId}.html`;

		const timetableHTML = await (await fetch(timetableURL)).text();

		const table = new Table(timetableHTML);

		const hours = table.getHours();
		if (Object.keys(this.hours).length < Object.keys(hours).length) this.hours = hours;

		const timetable = table.getDays();

		return timetable;
	}

	// INFO: Refactored by AI
	async createRoomTimetable(room: string) {
		// Find any class timetable to determine the number of days and hours
		const anyClass = this.timetables.classes.values().next().value;
		if (!anyClass) return;

		const daysCount = anyClass.timetable.length;
		const hoursCount = anyClass.timetable[0]?.length || 0;

		// Initialize roomTimetable as a 3D array: days x hours x lessons
		const roomTimetable: ITimetable = Array.from({ length: daysCount }, () =>
			Array.from({ length: hoursCount }, () => [])
		);

		for (const [, data] of this.timetables.classes) {
			for (let day = 0; day < data.timetable.length; day++) {
				for (let hour = 0; hour < data.timetable[day].length; hour++) {
					for (const lesson of data.timetable[day][hour]) {
						if (lesson.room === room) {
							if (!Array.isArray(roomTimetable[day][hour])) {
								roomTimetable[day][hour] = [];
							}
							roomTimetable[day][hour].push({
								classId: data.name,
								...lesson
							});
						}
					}
				}
			}
		}

		this.timetables.rooms.set(room, {
			name: room,
			id: room,
			timetable: roomTimetable
		});
	}

	async getAllRooms() {
		const roomSet = new Set<string>();

		for (const [, data] of this.timetables.classes) {
			for (const day of data.timetable) {
				for (const hour of day) {
					for (const lesson of hour) {
						if (lesson.room) {
							roomSet.add(lesson.room);
						}
					}
				}
			}
		}

		return Array.from(roomSet);
	}
}
