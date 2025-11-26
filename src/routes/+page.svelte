<script lang="ts">
	import { FindEmptyRoomsError, DaysOfTheWeek } from '$lib/constants';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let errorMessage = $state('');
	if (form?.error) {
		switch (form.error) {
			case FindEmptyRoomsError.DAY_NOT_EXIST:
				errorMessage = 'Wybrany dzień nie istnieje.';
				break;
			case FindEmptyRoomsError.LESSON_NOT_EXIST:
				errorMessage = 'Wybrana lekcja nie istnieje.';
				break;
			case FindEmptyRoomsError.NO_REQUIRED_DATA:
				errorMessage = 'Brak wymaganych danych do znalezienia wolnych sal.';
				break;
			default:
				errorMessage = 'Wystąpił nieznany błąd.';
		}
	}
</script>

<main class="font-sans flex items-center flex-col gap-4 py-4">
	<h1 class="text-3xl font-bold">Znajdź wolne sale</h1>

	<hr class="w-full border-t-2 border-red-300" />

	<form method="POST" class="flex items-center flex-col gap-3">
		<select name="day" class="rounded-md active:rounded-b-none bg-orange-300 border-orange-500">
			<option value="" disabled selected>Wybierz dzień</option>
			<option value="0">Poniedziałek</option>
			<option value="1">Wtorek</option>
			<option value="2">Środa</option>
			<option value="3">Czwartek</option>
			<option value="4">Piątek</option>
		</select>

		<select
			name="lesson-number"
			class="rounded-md active:rounded-b-none bg-blue-300 border-blue-500"
		>
			<option value="" disabled selected>Wybierz numer lekcji</option>
			{#each data.hoursNumbers as number}
				<option value={number - 1}>{number}</option>
			{/each}
		</select>

		{#if errorMessage}
			<p class="text-red-600 font-semibold">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			class="border rounded-md px-4 py-2 bg-yellow-300 border-yellow-500 cursor-pointer"
			>Znajdź</button
		>
	</form>

	{#if form?.success}
		<section class="border border-yellow-800 px-2 py-1 lessons-box">
			<p class="font-semibold text-lg">
				Znalezione sale w dniu {DaysOfTheWeek[form?.day]} na lekcji {form?.lessonIndex}:
			</p>
			<ul class="list-disc list-inside">
				{#each form?.rooms as room}
					<li class="ml-1">{room.name}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<img
		src="/krzysiu.png"
		alt="Krzysiu"
		class="hidden md:block absolute left-0 top-[25%] w-[25%] h-auto"
	/>
</main>
